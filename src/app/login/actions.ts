"use server";

import { createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import admin from "@/lib/firebaseAdmin";

export async function syncFirebaseAuth(idToken: string, requestedRole: string, phone: string | null) {
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new Error("Invalid or expired Firebase Auth token");
  }

  const email = decodedToken.email || "unknown@byby.com";

  // Check if phone is verified via Firebase (linked phone provider)
  const phoneVerified = !!decodedToken.phone_number;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // New user registration — store phone if provided
    user = await prisma.user.create({
      data: {
        email,
        name: decodedToken.name || email.split("@")[0],
        role: requestedRole || "USER",
        password: "FIREBASE_SSO_PLACEHOLDER",
        phone: phone || decodedToken.phone_number || null,
        phoneVerified,
      },
    });
  } else {
    // Existing user login — update phone if newly verified
    if (phone && !user.phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phone,
          phoneVerified,
        },
      });
    }
  }

  await createSession(user.id, user.role);
  return `/${user.role.toLowerCase()}`;
}
