"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

const prisma = new PrismaClient();

export async function submitVendorKYC(formData: FormData) {
  const businessName = formData.get("businessName") as string;
  const pan = formData.get("pan") as string;
  const gstin = formData.get("gstin") as string;

  if (!businessName || !pan) {
    throw new Error("Business Name and PAN are mandatory");
  }

  // Regex validations for mockup
  const normalizedPan = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(normalizedPan)) {
    throw new Error("Invalid PAN format");
  }

  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  if (!session || !session.userId || session.role !== "VENDOR") {
    throw new Error("Unauthorized");
  }

  // Upsert VendorProfile
  await prisma.vendorProfile.upsert({
    where: { userId: session.userId as string },
    update: {
      businessName,
      pan,
      gstin: gstin || null,
    },
    create: {
      userId: session.userId as string,
      businessName,
      pan,
      gstin: gstin || null,
      totalSales: 0,
      isBlocked: false,
    },
  });

  revalidatePath("/vendor");
}

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const price = parseFloat(formData.get("price") as string);
  const mrp = parseFloat(formData.get("mrp") as string);
  const categoryId = formData.get("categoryId") as string;
  const hsnCode = formData.get("hsnCode") as string;
  
  const purchaseBillNo = formData.get("purchaseBillNo") as string;
  const purchaseDate = new Date(formData.get("purchaseDate") as string);
  const sellerGstNo = formData.get("sellerGstNo") as string;
  const purchasePrice = parseFloat(formData.get("purchasePrice") as string);

  if (!name || isNaN(price) || isNaN(mrp) || !categoryId || !purchaseBillNo || !sellerGstNo || isNaN(purchasePrice)) {
    throw new Error("Missing required fields or invalid numeric inputs");
  }

  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  if (!session || !session.userId || session.role !== "VENDOR") {
    throw new Error("Unauthorized");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.userId as string }
  });

  if (!profile || profile.isBlocked) {
    throw new Error("Profile is restricted or missing"); // Cannot list if restricted beyond 12 Lakhs
  }

  await prisma.product.create({
    data: {
      vendorId: profile.id,
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      price,
      mrp,
      categoryId,
      hsnCode: hsnCode || null,
      purchaseBillNo,
      purchaseDate,
      sellerGstNo,
      purchasePrice
    }
  });

  revalidatePath("/vendor");
  revalidatePath("/user");
}
