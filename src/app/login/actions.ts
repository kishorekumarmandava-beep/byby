"use server";

import { createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import admin from "@/lib/firebaseAdmin";

export async function syncFirebaseAuth(idToken: string, requestedRole: string, phone: string, name: string) {
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new Error("Invalid or expired Firebase Auth token");
  }

  // If email is missing (phone-only auth), we generate a placeholder email to satisfy DB uniqueness
  const fallbackEmail = `phone_${phone.replace(/\+/g, '')}@byby.com`;
  const email = decodedToken.email || fallbackEmail;

  // Check if phone is verified via Firebase
  const phoneVerified = !!decodedToken.phone_number || !!phone;

  // We look up the user primarily by phone (since it's a phone-first authentication)
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone },
        { email }
      ]
    },
  });

  if (!user) {
    // New user registration — strictly enforcing Name
    if (!name || name.trim() === "") {
        throw new Error("Name is required for new registration");
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
  } else {
    // Existing user login — update phone and name if necessary
    const updateData: any = {};
    if (phone && !user.phone) {
      updateData.phone = phone;
      updateData.phoneVerified = phoneVerified;
    }
    // Update name if they provide one and they currently have a placeholder
    if (name && name.trim() !== "" && (!user.name || user.name.startsWith("ByBy"))) {
      updateData.name = name.trim();
    }
    
    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }
  }

  await createSession(user.id, user.role);
  return `/${user.role.toLowerCase()}`;
}
