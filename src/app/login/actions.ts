"use server";

import { createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import admin from "@/lib/firebaseAdmin";

// Return a result object instead of throwing — prevents the opaque
// "Server Components render" error in production builds.
type AuthResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function syncFirebaseAuth(
  idToken: string,
  requestedRole: string,
  phone: string,
  name: string
): Promise<AuthResult> {
  // ── Step 1: Verify Firebase ID Token ──────────────
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error: any) {
    console.error("[syncFirebaseAuth] Token verification failed:", error?.message || error);
    return {
      success: false,
      error: "Authentication failed. Your session may have expired — please try again.",
    };
  }

  // ── Step 2: Resolve email & phone ─────────────────
  const fallbackEmail = `phone_${phone.replace(/\+/g, "")}@byby.com`;
  const email = decodedToken.email || fallbackEmail;
  const phoneVerified = !!decodedToken.phone_number || !!phone;

  // ── Step 3: Find or Create User ───────────────────
  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (!user) {
      // New registration
      if (!name || name.trim() === "") {
        return {
          success: false,
          error: "Your name is required to create an account.",
        };
      }

      user = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          role: requestedRole || "USER",
          password: "FIREBASE_SSO_PLACEHOLDER",
          phone: phone || decodedToken.phone_number || null,
          phoneVerified,
        },
      });
      console.log("[syncFirebaseAuth] New user created:", user.id, user.role);
    } else {
      // Existing user — update fields if needed
      const updateData: Record<string, any> = {};
      if (phone && !user.phone) {
        updateData.phone = phone;
        updateData.phoneVerified = phoneVerified;
      }
      if (name && name.trim() !== "" && (!user.name || user.name.startsWith("ByBy"))) {
        updateData.name = name.trim();
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
      console.log("[syncFirebaseAuth] Existing user logged in:", user.id, user.role);
    }

    // ── Step 4: Create Session Cookie ─────────────────
    try {
      await createSession(user.id, user.role);
    } catch (sessionError: any) {
      console.error("[syncFirebaseAuth] Session creation failed:", sessionError?.message || sessionError);
      return {
        success: false,
        error: "Login succeeded but session could not be created. Please try again.",
      };
    }

    return {
      success: true,
      redirectTo: `/${user.role.toLowerCase()}`,
    };
  } catch (dbError: any) {
    console.error("[syncFirebaseAuth] Database error:", dbError?.message || dbError);

    // Handle specific Prisma errors
    if (dbError?.code === "P2002") {
      return {
        success: false,
        error: "An account with this phone number or email already exists. Please try logging in.",
      };
    }

    return {
      success: false,
      error: "Something went wrong on our end. Please try again in a moment.",
    };
  }
}
