"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";

export async function placeMockOrder(formData: FormData) {
  const price = parseFloat(formData.get("price") as string);
  
  if (isNaN(price)) return;

  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  if (!session || !session.userId) {
    throw new Error("Must be logged in to order");
  }

  // Calculate Mock Indian E-commerce Compliance limits
  // Sec 194-O TDS: 1% 
  // GST TCS: 1%
  const tdsAmount = price * 0.01;
  const tcsAmount = price * 0.01;

  await prisma.order.create({
    data: {
      userId: session.userId as string,
      totalAmount: price,
      tdsAmount,
      tcsAmount,
      status: "COMPLETED"
    }
  });

  redirect("/user?success=true");
}
