export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { addToCart } from "./actions/cartActions";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import Link from "next/link";
import AddToCartButton from "./components/AddToCartButton";

export default async function PublicStorefront(props: { searchParams: Promise<{ success?: string; added?: string }> }) {
  const cookieStr = (await cookies()).get("session")?.value;
  let session = null;
  try {
    session = await decrypt(cookieStr);
  } catch (e) {}

  if (session && session.userId) {
    const validUser = await prisma.user.findUnique({ where: { id: session.userId as string } });
    if (!validUser) session = null;
  }

  const searchParams = await props.searchParams;
  const { seedGlobalMocks } = await import("./actions/categoryActions");
  await seedGlobalMocks();

  const products = await prisma.product.findMany({
    include: { vendor: true, category: true },
  });

  const categories = await prisma.category.findMany({ where: { isApproved: true } });

  let cartItemCount = 0;
  if (session && session.userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId as string },
      include: { items: true },
    });
    cartItemCount = cart?.items.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
  }

  return (
    <div className="page-wrapper">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content container">
          <h1 className="hero-title animate-fade-in-up">
            Shop <span className="gradient-text">Smarter</span>,<br />
            Stay <span className="gradient-text">Compliant</span>
          </h1>
          <p className="hero-subtitle animate-fade-in-up">
            India&apos;s marketplace with built-in GST tracking, TDS compliance, 
            and verified vendors. Every transaction, fully transparent.
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }} className="animate-fade-in-up">
            {session ? (
              <Link href="/user/cart" className="btn btn-primary btn-lg">
                🛒 Cart ({cartItemCount})
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary btn-lg">
                Get Started
              </Link>
            )}
            <a href="#products" className="btn btn-ghost btn-lg" style={{ border: "1.5px solid var(--border-primary)" }}>
              Browse Products ↓
            </a>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <div className="container">
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
      </div>

      {/* Products Section */}
      <section className="container" id="products" style={{ paddingTop: "var(--space-xl)" }}>
        <div className="section-header">
          <h2 className="section-title">Explore Products</h2>
          {session && (
            <Link href="/user/cart" className="btn btn-accent btn-sm">
              🛒 View Cart ({cartItemCount})
            </Link>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="category-filters" style={{ marginBottom: "var(--space-xl)" }}>
          <span className="category-chip active">All</span>
          {categories.map((cat: any) => (
            <span key={cat.id} className="category-chip">
              {cat.name}
            </span>
          ))}
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p className="empty-state-message">No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p: any) => {
              const hasDiscount = p.mrp > p.price;
              const discountPercentage = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;

              return (
                <div key={p.id} className="product-card">
                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="product-card-badge">
                      {discountPercentage}% OFF
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="product-card-image">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="product-card-image-placeholder">
                        📷 No Image
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
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

                    {/* Pricing */}
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

                    {/* Add to Cart */}
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
      </section>
    </div>
  );
}
