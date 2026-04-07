"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";

export async function addToCart(formData: FormData) {
  const productId = formData.get("productId") as string;
  const cookieStr = (await cookies()).get("session")?.value;
  let session = null;
  try { session = await decrypt(cookieStr); } catch (e) {}

  if (!session || !session.userId) {
    redirect("/login");
  }

  // Double check DB trace for ghost sessions
  const validUser = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!validUser) {
    redirect("/login");
  }

  // UPSERT Cart
  const cart = await prisma.cart.upsert({
    where: { userId: session.userId as string },
    update: {},
    create: { userId: session.userId as string }
  });

  // Check if item exists in Cart
  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId }
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + 1 }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity: 1
      }
    });
  }

  revalidatePath("/user/cart");
  redirect("/user?added=true");
}

export async function removeCartItem(formData: FormData) {
  const itemId = formData.get("itemId") as string;
  await prisma.cartItem.delete({
    where: { id: itemId }
  });
  revalidatePath("/user/cart");
}

export async function checkoutCart(formData: FormData) {
  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  if (!session || !session.userId) throw new Error("Unauthorized");

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId as string },
    include: { items: { include: { product: true } } }
  });

  if (!cart || cart.items.length === 0) return;

  // Calculate Aggregates
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of cart.items) {
    const linePrice = item.product.price * item.quantity;
    subtotal += linePrice;
    taxAmount += linePrice * (item.product.taxRate / 100);
  }

  const shippingCharge = 50.0; // Flat mock rate
  const totalAmount = subtotal + taxAmount + shippingCharge;
  
  // Compliance limits
  const tdsAmount = subtotal * 0.01;
  const tcsAmount = subtotal * 0.01;

  // Execute Order map securely
  await prisma.order.create({
    data: {
      userId: session.userId as string,
      totalAmount,
      taxAmount,
      shippingCharge,
      tdsAmount,
      tcsAmount,
      status: "COMPLETED",
      items: {
        create: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          pricePaid: item.product.price
        }))
      }
    }
  });

  // Empty the Cart
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id }
  });

  redirect("/user/cart?success=true");
}
