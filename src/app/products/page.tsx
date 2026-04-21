"use client";

import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), where("status", "==", "active"));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="container" style={{ marginTop: "4rem" }}>
      <h1>Shop Products</h1>
      <p>Discover products from verified vendors directly.</p>

      {loading ? <p>Loading catalog...</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "2rem", marginTop: "2rem" }}>
          {products.map(p => (
            <Link key={p.productId} href={`/products/${p.slug}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", display: "block" }}>
              <div style={{ padding: "1rem" }}>
                <img src={p.images[0]} alt={p.title} width={200} height={200} style={{ objectFit: "cover", width: "100%", height: "200px" }} />
                <h3 style={{ margin: "1rem 0 0.5rem" }}>{p.title}</h3>
                <p>₹{p.price}</p>
                <div style={{ marginTop: "1rem" }}>
                  <button style={{ width: "100%", padding: "0.5rem", background: "black", color: "white", cursor: "pointer" }}>View Details</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
