export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { removeCartItem, checkoutCart } from "@/app/actions/cartActions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CartPage(props: { searchParams: Promise<{ success?: string }> }) {
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

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId as string },
    include: { items: { include: { product: true } } },
  });

  const items = cart?.items || [];

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const taxAmount = items.reduce((acc, item) => acc + item.product.price * item.quantity * (item.product.taxRate / 100), 0);
  const shippingCharge = items.length > 0 ? 50.0 : 0;
  const totalAmount = subtotal + taxAmount + shippingCharge;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div className="dashboard-header animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-md)" }}>
            <div>
              <h1 className="dashboard-title">Shopping Cart</h1>
              <p className="dashboard-subtitle">{items.length} {items.length === 1 ? "item" : "items"} in your cart</p>
            </div>
            <Link href="/user" className="btn btn-ghost" style={{ border: "1.5px solid var(--border-primary)" }}>
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Success Alert */}
        {searchParams?.success && (
          <div className="alert alert-success" style={{ marginBottom: "var(--space-xl)" }}>
            <span>🎉</span>
            <div><strong>Checkout Complete!</strong> Order processed with compliance tracking (TDS/TCS/GST).</div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="panel animate-fade-in-up">
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <p className="empty-state-message">Your cart is empty</p>
              <Link href="/user" className="btn btn-primary" style={{ marginTop: "var(--space-lg)" }}>
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }} className="animate-fade-in-up">
            {/* Cart Items */}
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <h3 className="cart-item-title">{item.product.name}</h3>
                  <p className="cart-item-meta">Qty: {item.quantity} · GST: {item.product.taxRate}%</p>
                  <p className="cart-item-price" style={{ marginTop: "var(--space-xs)" }}>
                    ₹{(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
                <form action={removeCartItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button type="submit" className="btn btn-danger btn-sm">
                    Remove
                  </button>
                </form>
              </div>
            ))}

            {/* Order Summary */}
            <div className="cart-summary" style={{ marginTop: "var(--space-md)" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "var(--space-md)" }}>Order Summary</h2>
              
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>GST (Mapped per item)</span>
                <strong>₹{taxAmount.toFixed(2)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Shipping (Flat rate)</span>
                <strong>₹{shippingCharge.toFixed(2)}</strong>
              </div>

              <div className="cart-summary-total">
                <span>Total</span>
                <span className="price">₹{totalAmount.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: "var(--space-md)", padding: "var(--space-sm) var(--space-md)", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                💡 TDS (1%) and TCS (1%) will be computed and recorded upon checkout
              </div>

              <form action={checkoutCart} style={{ marginTop: "var(--space-lg)" }}>
                <button type="submit" className="btn btn-primary btn-lg btn-full">
                  Confirm Checkout — ₹{totalAmount.toFixed(2)}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
