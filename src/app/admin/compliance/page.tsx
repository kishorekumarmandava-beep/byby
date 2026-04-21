"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebaseClient";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function AdminCompliance() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettlements = async () => {
      setLoading(true);
      try {
        const q = query(
           collection(db, "vendorSettlements"), 
           orderBy("createdAt", "desc"),
           limit(50)
        );
        const snap = await getDocs(q);
        setSettlements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlements();
  }, []);

  const totalTCS = settlements.reduce((sum, s) => sum + s.tcsAmount, 0);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
           <h1>GST Compliance & Audit Log</h1>
           <button style={{ padding: "0.5rem 1rem", background: "black", color: "white" }}>
              Export GSTR-8 (CSV)
           </button>
        </div>

        {loading ? <p>Loading audit logs...</p> : (
           <>
              <div style={{ padding: "1.5rem", background: "#f5f5f5", borderRadius: "8px", marginBottom: "2rem" }}>
                 <h2>TCS (Section 52) Ledger Summary</h2>
                 <p style={{ color: "gray" }}>Accumulated TCS liability to be filed dynamically based on recent 50 logs.</p>
                 <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "red" }}>
                    Total TCS to Emit: ₹{totalTCS.toFixed(2)}
                 </p>
              </div>

              <h3>Recent Vendor Settlements</h3>
              {settlements.length === 0 ? <p>No settlements generated yet.</p> : (
                 <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                       <thead>
                          <tr style={{ background: "#eee" }}>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Order ID</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Vendor ID</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Net Supply</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd", color: "red" }}>TCS (1%)</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Platform Fee (5%)</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Vendor Payout</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Status</th>
                          </tr>
                       </thead>
                       <tbody>
                          {settlements.map(s => (
                             <tr key={s.id}>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", fontSize: "0.85rem" }}>{s.orderId}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", fontSize: "0.85rem" }}>{s.vendorId}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>₹{s.netTaxableSupply.toFixed(2)}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", color: "red", fontWeight: "bold" }}>₹{s.tcsAmount.toFixed(2)}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>₹{s.platformFeeAmount.toFixed(2)}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", color: "green", fontWeight: "bold" }}>₹{s.netSettlementAmount.toFixed(2)}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>
                                   <span style={{ padding: "0.25rem 0.5rem", background: "lightyellow", borderRadius: "4px", fontSize: "0.85rem" }}>{s.status}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}
           </>
        )}
      </div>
    </ProtectedRoute>
  );
}
