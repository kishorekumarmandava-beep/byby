export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { addToCart } from "../actions/cartActions";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import { redirect } from "next/navigation";

export default async function UserDashboard(props: { searchParams: Promise<{ success?: string; added?: string }> }) {
  const cookieStr = (await cookies()).get("session")?.value;
  let session = null;
  try {
    session = await decrypt(cookieStr);
  } catch (e) {}

  if (!session || !session.userId) {
    redirect("/login");
  }

  const validUser = await prisma.user.findUnique({ where: { id: session.userId as string } });
  if (!validUser) {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const { seedGlobalMocks } = await import("../actions/categoryActions");
  await seedGlobalMocks();

  const products = await prisma.product.findMany({
    include: { vendor: true, category: true },
  });

  const categories = await prisma.category.findMany({ where: { isApproved: true } });

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId as string },
    include: { items: true },
  });
  const cartItemCount = cart?.items.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  const orderCount = await prisma.order.count({ where: { userId: session.userId as string } });

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-md)" }}>
            <div>
              <h1 className="dashboard-title">
                Hello, {validUser.name} 👋
              </h1>
              <p className="dashboard-subtitle">Browse the marketplace and find what you need</p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <Link href="/user/cart" className="btn btn-primary">
                🛒 Cart ({cartItemCount})
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: "var(--space-2xl)" }}>
          <div className="stat-card">
            <span className="stat-card-label">Cart Items</span>
            <span className="stat-card-value primary">{cartItemCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Orders Placed</span>
            <span className="stat-card-value accent">{orderCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Account Type</span>
            <span className="stat-card-value info" style={{ fontSize: "1.25rem" }}>{validUser.role}</span>
          </div>
        </div>

        {/* Alerts */}
        {searchParams?.success && (
          <div className="alert alert-success" style={{ marginBottom: "var(--space-lg)" }}>
            <span>🎉</span>
            <div><strong>Order Successful!</strong> TDS (1%) and TCS (1%) compliance traced and recorded.</div>
          </div>
        )}
        {searchParams?.added && (
          <div className="alert alert-info" style={{ marginBottom: "var(--space-lg)" }}>
            <span>✅</span>
            <div><strong>Added to Cart!</strong> Review your items from the cart.</div>
          </div>
        )}

        {/* Products Section */}
        <div className="section-header">
          <h2 className="section-title">Marketplace</h2>
        </div>

        {/* Category Chips */}
        <div className="category-filters" style={{ marginBottom: "var(--space-xl)" }}>
          <span className="category-chip active">All</span>
          {categories.map((cat: any) => (
            <span key={cat.id} className="category-chip">{cat.name}</span>
          ))}
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p className="empty-state-message">No products available yet.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p: any) => {
              const hasDiscount = p.mrp > p.price;
              const discountPercentage = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

              return (
                <div key={p.id} className="product-card">
                  {hasDiscount && (
                    <div className="product-card-badge">{discountPercentage}% OFF</div>
                  )}
                  <div className="product-card-image">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="product-card-image-placeholder">📷 No Image</div>
                    )}
                  </div>
                  <div className="product-card-content">
                    {p.category && (
                      <span className="product-card-category">{p.category.name}</span>
                    )}
                    <h3 className="product-card-title">{p.name}</h3>
                    {p.description && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </p>
                    )}
                    <p className="product-card-vendor">by {p.vendor.businessName}</p>
                    <div className="product-card-pricing">
                      <span className="product-card-price">₹{p.price.toLocaleString()}</span>
                      {hasDiscount && (
                        <>
                          <span className="product-card-mrp">₹{p.mrp.toLocaleString()}</span>
                          <span className="product-card-discount">{discountPercentage}% off</span>
                        </>
                      )}
                    </div>
                    <span className="product-card-tax">GST {p.taxRate}% included</span>
                    <form action={addToCart}>
                      <input type="hidden" name="productId" value={p.id} />
                      <AddToCartButton />
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
