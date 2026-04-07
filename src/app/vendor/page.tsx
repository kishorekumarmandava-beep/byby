export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { submitVendorKYC } from "./actions";

export default async function VendorDashboard() {
  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  let profile = null;
  let categories: any[] = [];
  let productCount = 0;

  if (session && session.userId) {
    profile = await prisma.vendorProfile.findUnique({
      where: { userId: session.userId as string },
    });

    const { seedAmazonCategories, seedMockProducts } = await import("../actions/categoryActions");

    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      await seedAmazonCategories();
    }

    categories = await prisma.category.findMany({ where: { isApproved: true } });

    if (profile) {
      productCount = await prisma.product.count({ where: { vendorId: profile.id } });
      if (productCount === 0) {
        await seedMockProducts(profile.id);
        productCount = await prisma.product.count({ where: { vendorId: profile.id } });
      }
    }
  }

  const isComplianceBlocked = profile && !profile.gstin && profile.totalSales > 1200000;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: "720px" }}>
        {/* Dashboard Header */}
        <div className="dashboard-header animate-fade-in">
          <h1 className="dashboard-title">Vendor Dashboard</h1>
          <p className="dashboard-subtitle">Manage your products, KYC, and compliance</p>
        </div>

        {/* Compliance Alert */}
        {isComplianceBlocked && (
          <div className="alert alert-danger" style={{ marginBottom: "var(--space-xl)" }}>
            <span>🚨</span>
            <div>
              <strong>COMPLIANCE ALERT:</strong> Your sales exceeded ₹12,00,000 without a registered GSTIN. 
              New listings and orders are restricted until you update your GSTIN.
            </div>
          </div>
        )}

        {/* Stats */}
        {profile && (
          <div className="stat-grid animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
            <div className="stat-card">
              <span className="stat-card-label">Total Sales</span>
              <span className="stat-card-value accent">₹{profile.totalSales.toLocaleString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Products</span>
              <span className="stat-card-value primary">{productCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Status</span>
              <span className={`stat-card-value ${isComplianceBlocked ? "" : "accent"}`} style={{ fontSize: "1.1rem" }}>
                {isComplianceBlocked ? (
                  <span className="badge badge-danger">RESTRICTED</span>
                ) : (
                  <span className="badge badge-success">ACTIVE</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* KYC Form */}
        <div className="panel animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="panel-header">
            <h2 className="panel-title">🪪 KYC & Verification</h2>
            {profile && <span className="badge badge-success">Submitted</span>}
          </div>
          <div className="panel-body">
            <form action={submitVendorKYC} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input name="businessName" defaultValue={profile?.businessName || ""} required className="form-input" placeholder="Your registered business name" />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input 
                    name="pan" 
                    defaultValue={profile?.pan || ""} 
                    required 
                    pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}" 
                    title="PAN: 5 Letters, 4 Numbers, 1 Letter (e.g. ABCDE1234F)" 
                    placeholder="ABCDE1234F" 
                    className="form-input" 
                    style={{ textTransform: "uppercase" }} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    GSTIN <span className="form-label-hint">(Optional until ₹12L)</span>
                  </label>
                  <input name="gstin" defaultValue={profile?.gstin || ""} placeholder="22AAAAA0000A1Z5" className="form-input" />
                </div>
              </div>

              <button type="submit" className="btn btn-accent btn-lg" style={{ marginTop: "var(--space-sm)" }}>
                {profile ? "Update KYC" : "Submit KYC"}
              </button>
            </form>
          </div>
        </div>

        {/* Product Listing Form */}
        {profile && !isComplianceBlocked && (
          <div className="panel animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
            <div className="panel-header">
              <h2 className="panel-title">📦 List a New Product</h2>
            </div>
            <div className="panel-body">
              <form
                action={async (formData) => {
                  "use server";
                  const { createProduct } = await import("./actions");
                  await createProduct(formData);
                }}
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
              >
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input name="name" required className="form-input" placeholder="e.g. Wireless Bluetooth Earbuds" />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" placeholder="Product details, features, specifications..." className="form-textarea" />
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL <span className="form-label-hint">(Optional)</span></label>
                  <input name="imageUrl" type="url" placeholder="https://images.unsplash.com/..." className="form-input" />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">MRP (₹)</label>
                    <input name="mrp" type="number" required className="form-input" placeholder="999" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹)</label>
                    <input name="price" type="number" required className="form-input" placeholder="799" />
                  </div>
                </div>

                <hr className="divider" />
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-primary)" }}>
                  📋 Compliance Traces (Mandatory)
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Purchase Bill No.</label>
                    <input name="purchaseBillNo" required className="form-input" placeholder="INV-2024-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Date</label>
                    <input name="purchaseDate" type="date" required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Seller&apos;s GSTIN</label>
                    <input name="sellerGstNo" required placeholder="22XXXXX0000X1Z5" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bought Price (₹)</label>
                    <input name="purchasePrice" type="number" required className="form-input" placeholder="500" />
                  </div>
                </div>

                <hr className="divider" />

                <div className="form-group">
                  <label className="form-label">
                    Category <span className="form-label-hint">(Amazon.in standards)</span>
                  </label>
                  <select name="categoryId" required className="form-select">
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">HSN Code <span className="form-label-hint">(Optional)</span></label>
                  <input name="hsnCode" className="form-input" placeholder="8517" />
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: "var(--space-sm)" }}>
                  Publish Product
                </button>
              </form>
            </div>

            {/* Category suggestion */}
            <hr className="divider" style={{ margin: 0 }} />
            <div className="panel-body">
              <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "var(--space-md)" }}>Missing a category?</p>
              <form
                action={async (formData) => {
                  "use server";
                  const { proposeCategory } = await import("../actions/categoryActions");
                  await proposeCategory(formData);
                }}
                style={{ display: "flex", gap: "var(--space-sm)" }}
              >
                <input name="name" required placeholder="Propose new category..." className="form-input" style={{ flex: 1 }} />
                <button type="submit" className="btn btn-ghost" style={{ border: "1.5px solid var(--border-primary)", whiteSpace: "nowrap" }}>
                  Suggest
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
