"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebaseClient";
import { collection, query, getDocs, doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function AdminShipping() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "shippingProviders"));
      const snap = await getDocs(q);
      setProviders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSeedProviders = async () => {
    try {
      setLoading(true);
      const defaultProviders = [
        {
          providerId: "dummy-shiprocket",
          name: "Shiprocket (Dummy Mode)",
          type: "aggregator",
          supportsCOD: true,
          supportsReverseLogistics: true,
          status: "active"
        },
        {
          providerId: "delhivery-direct",
          name: "Delhivery Direct",
          type: "carrier",
          supportsCOD: true,
          supportsReverseLogistics: true,
          status: "active"
        }
      ];

      for (const p of defaultProviders) {
        await setDoc(doc(db, "shippingProviders", p.providerId), p);
      }
      alert("Seeded default providers!");
      fetchProviders();
    } catch (err) {
      console.error(err);
      alert("Error seeding providers");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Shipping Providers</h1>
          <button onClick={handleSeedProviders} style={{ padding: "0.5rem 1rem", background: "black", color: "white" }}>
            Seed Default Providers
          </button>
        </div>

        {loading ? <p>Loading...</p> : (
          <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
            {providers.length === 0 && <p>No providers configured. Click Seed to initialize.</p>}
            {providers.map(p => (
              <div key={p.providerId} style={{ border: "1px solid #ccc", padding: "1rem", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3>{p.name} <span style={{ fontSize: "0.8rem", color: "gray", fontWeight: "normal" }}>({p.type})</span></h3>
                  <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
                    COD: {p.supportsCOD ? 'Yes' : 'No'} | Reverse Pickup: {p.supportsReverseLogistics ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span style={{ padding: "0.25rem 0.5rem", background: p.status === 'active' ? "lightgreen" : "lightgray" }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
