"use client";

import { useAuth } from "@/lib/firebase/context";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CartAndCheckout() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [dummyCart, setDummyCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd fetch this from cartSessions doc or localStorage.
    // Simulating a dummy item for MVP checkout flow testing
    setTimeout(() => {
      setDummyCart([
        {
          productId: "dummy-1",
          title: "Test Marketplace Product",
          vendorId: "vendorB123",
          price: 1000,
          qty: 1,
          gstRate: 18
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleCreateOrder = async () => {
    if (!user) return alert("Please login to checkout.");
    setLoading(true);

    const orderId = `ORD-${Date.now()}`;
    const subtotal = dummyCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxTotal = dummyCart.reduce((sum, item) => sum + ((item.price * item.gstRate / 100) * item.qty), 0);
    const grandTotal = subtotal + taxTotal;

    const vendorIds = Array.from(new Set(dummyCart.map(i => i.vendorId)));

    try {
      const orderRef = doc(db, "orders", orderId);
      await setDoc(orderRef, {
        orderId,
        customerUid: user.uid,
        items: dummyCart,
        vendorIds,
        orderStatus: "created",
        paymentStatus: "pending",
        paymentMethod: "dummy_gateway",
        subtotal,
        taxTotal,
        shippingTotal: 0,
        grandTotal,
        currency: "INR",
        shippingAddress: { line1: "Test Address", pincode: "110001" }, // Simplified
        placedAt: serverTimestamp(),
      });

      // Proceed to fake payment layer
      router.push(`/checkout/payment?orderId=${orderId}&amount=${grandTotal}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "4rem" }}>Loading cart...</div>;

  return (
    <div className="container" style={{ maxWidth: 800, marginTop: "4rem" }}>
      <h1>Your Cart</h1>
      
      {dummyCart.length === 0 ? <p>Your cart is empty.</p> : (
        <div style={{ marginTop: "2rem" }}>
          {dummyCart.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", padding: "1rem 0" }}>
              <div>
                <h3>{item.title}</h3>
                <p>Qty: {item.qty}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p>₹{item.price}</p>
                <p style={{ fontSize: "0.8rem", color: "gray" }}>+ {item.gstRate}% GST</p>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "2rem", textAlign: "right", background: "#f5f5f5", padding: "1rem" }}>
            <p>Subtotal: ₹{dummyCart.reduce((sum, item) => sum + (item.price * item.qty), 0)}</p>
            <h3>Total (incl. taxes): ₹{dummyCart.reduce((sum, item) => sum + (item.price * item.qty * (1 + item.gstRate/100)), 0)}</h3>
            <button onClick={handleCreateOrder} style={{ padding: "1rem 2rem", background: "black", color: "white", marginTop: "1rem" }}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
