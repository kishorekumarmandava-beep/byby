"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function seedAmazonCategories() {
  const categories = [
    "Electronics",
    "Men's Fashion",
    "Women's Fashion",
    "Home & Kitchen",
    "Beauty & Health",
    "E-Books",
    "Courses",
    "Apparel"
  ];
  
  // Upsert categories secretly
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, isApproved: true }
    });
  }
}

export async function seedMockProducts(vendorId: string) {
  // Check if vendor already has products
  const count = await prisma.product.count({ where: { vendorId } });
  if (count > 0) return; // Prevent double seeding

  const categoryMap = await prisma.category.findMany();
  
  const getCatId = (name: string) => categoryMap.find(c => c.name === name)?.id;
  
  const mockProducts = [
    { name: "Digital Marketing Mastery", price: 1999, mrp: 2999, categoryId: getCatId("Courses"), imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" },
    { name: "Full Stack Web Dev Bootcamp", price: 3499, mrp: 4999, categoryId: getCatId("Courses"), imageUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166" },
    { name: "Advanced Excel Tricks", price: 999, mrp: 1499, categoryId: getCatId("Courses"), imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f" },
    
    { name: "The Pragmatic Programmer PDF", price: 499, mrp: 999, categoryId: getCatId("E-Books"), imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c" },
    { name: "Clean Code ebook", price: 599, mrp: 799, categoryId: getCatId("E-Books"), imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765" },
    { name: "Atomic Habits PDF", price: 399, mrp: 599, categoryId: getCatId("E-Books"), imageUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73" },
    
    { name: "Cotton Classic T-Shirt", price: 699, mrp: 999, categoryId: getCatId("Apparel"), imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab" },
    { name: "Formal Office Shirt", price: 1299, mrp: 1999, categoryId: getCatId("Apparel"), imageUrl: "https://images.unsplash.com/photo-1506544747-062e5de83665" },
    { name: "Running Shoes", price: 2199, mrp: 3499, categoryId: getCatId("Apparel"), imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff" },
    
    { name: "Wireless Earbuds", price: 1499, mrp: 2499, categoryId: getCatId("Electronics"), imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df" },
    { name: "Smart Watch v2", price: 2999, mrp: 4999, categoryId: getCatId("Electronics"), imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30" },
    { name: "10000mAh Power Bank", price: 899, mrp: 1299, categoryId: getCatId("Electronics"), imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5" }
  ];

  for (const product of mockProducts) {
    if (!product.categoryId) continue;
    await prisma.product.create({
      data: {
        vendorId,
        name: product.name,
        description: "Official dummy prototype dataset item mapped exclusively for marketplace testing environments.",
        imageUrl: product.imageUrl,
        price: product.price,
        mrp: product.mrp,
        categoryId: product.categoryId,
        hsnCode: "8517", // mock HSN
        taxRate: 18.0,
        
        // New Mandatory Compliance Metrics
        purchaseBillNo: `BILL-${Math.floor(Math.random() * 10000)}`,
        purchaseDate: new Date(),
        sellerGstNo: "22DUMMY0000A1Z5",
        purchasePrice: product.price * 0.70 // Mock 30% margin
      }
    });
  }
}

export async function seedGlobalMocks() {
  const count = await prisma.product.count();
  if (count > 0) return;

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await seedAmazonCategories();
  }

  // Create dummy system vendor
  let systemVendor = await prisma.vendorProfile.findFirst({
    where: { businessName: "Mock Prototype Vendor" }
  });

  if (!systemVendor) {
    try {
      // Upsert dummy user for vendor to avoid unique constraint crashes
      const dummyUser = await prisma.user.upsert({
        where: { email: "mockvendor@example.com" },
        update: {},
        create: {
          name: "Mock Vendor",
          email: "mockvendor@example.com",
          role: "VENDOR",
          password: "mockpassword",
        }
      });

      systemVendor = await prisma.vendorProfile.create({
        data: {
          userId: dummyUser.id,
          businessName: "Mock Prototype Vendor",
          pan: "MOCKP1234V",
          gstin: "22XXXXX0000X1Z5",
          totalSales: 0
        }
      });
      
      await seedMockProducts(systemVendor.id);
    } catch (err) {
      console.error("Failed to seed global mocks:", err);
    }
  } else {
    await seedMockProducts(systemVendor.id);
  }
}

export async function proposeCategory(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name || name.trim() === "") return;
  
  // Creates an unapproved category
  await prisma.category.create({
    data: {
      name: name.trim(),
      isApproved: false
    }
  });
  
  revalidatePath("/vendor");
}

export async function approveCategory(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.category.update({
    where: { id },
    data: { isApproved: true }
  });
  revalidatePath("/admin");
  revalidatePath("/vendor");
}

export async function rejectCategory(formData: FormData) {
  const id = formData.get("id") as string;
  await prisma.category.delete({
    where: { id }
  });
  revalidatePath("/admin");
}
