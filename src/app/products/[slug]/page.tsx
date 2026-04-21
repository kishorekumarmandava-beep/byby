"use client";

import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProductDetails() {
  const params = useParams();
  const slug = params.slug;

  const [product, setProduct] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const q = query(collection(db, "products"), where("slug", "==", slug), where("status", "==", "active"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const pData = snap.docs[0].data();
          setProduct(pData);
          
          // Fetch vendor info securely (Only active vendors)
          const vQuery = query(collection(db, "vendors"), where("vendorId", "==", pData.vendorUid));
          const vSnap = await getDocs(vQuery);
          if (!vSnap.empty) {
            setVendor(vSnap.docs[0].data());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProduct();
  }, [slug]);

  if (loading) return <div className="container" style={{ marginTop: "4rem" }}>Loading...</div>;
  if (!product) return <div className="container" style={{ marginTop: "4rem" }}>Product not found</div>;

  return (
    <div className="container" style={{ marginTop: "4rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
      <div>
        <img src={product.images[0]} alt={product.title} style={{ width: "100%", maxHeight: "500px", objectFit: "cover" }} />
      </div>
      <div>
        <h1>{product.title}</h1>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "1rem 0" }}>
          ₹{product.price}
          <span style={{ fontSize: "1rem", fontWeight: "normal", color: "gray", marginLeft: "1rem" }}>
            Included GST: {product.gstRate}%
          </span>
        </p>

        {vendor && (
          <div style={{ background: "#f5f5f5", padding: "1rem", margin: "2rem 0" }}>
            <p><strong>Sold by:</strong> {vendor.businessName}</p>
            <p style={{ fontSize: "0.8rem", color: "gray" }}>GSTIN: {vendor.gstin}</p>
          </div>
        )}

        <button style={{ background: "black", color: "white", padding: "1rem 2rem", fontSize: "1.1rem", width: "100%", cursor: "pointer" }}>
          Add to Cart
        </button>

        <div style={{ marginTop: "2rem" }}>
          <h3>Details</h3>
          <p>HSN Code: {product.hsnCode}</p>
          <p>SKU: {product.sku || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
