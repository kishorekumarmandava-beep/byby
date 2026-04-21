"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/context";

export default function VendorCompliance() {
  const { user } = useAuth();
  const [tdsLedgers, setTdsLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTdsData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(
           collection(db, "tdsLedger"), 
           where("vendorId", "==", user.uid),
           orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setTdsLedgers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTdsData();
  }, [user]);

  const totalDeducted = tdsLedgers.reduce((sum, item) => sum + item.tdsAmountDeducted, 0);

  const simulateForm16A = () => {
    alert("Simulating PDF Generation for Form 16A... \nTotal TDS: ₹" + totalDeducted.toFixed(2));
  };

  return (
    <ProtectedRoute allowedRoles={["vendor"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
           <h1>Tax Compliance Dashboard</h1>
           <button onClick={simulateForm16A} style={{ padding: "0.5rem 1rem", background: "black", color: "white", cursor: "pointer" }}>
              Download Form 16A (TDS Certificate)
           </button>
        </div>

        {loading ? <p>Loading compliance logs...</p> : (
           <>
              <div style={{ padding: "1.5rem", background: "#f5f5f5", borderRadius: "8px", marginBottom: "2rem" }}>
                 <h2>Section 194O (IT) TDS Summary</h2>
                 <p style={{ color: "gray" }}>This TDS is deposited by the platform against your PAN. You can claim it during ITR filing.</p>
                 <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "green" }}>
                    Total TDS Claimable: ₹{totalDeducted.toFixed(2)}
                 </p>
              </div>

              <h3>Recent Section 194O Deductions</h3>
              {tdsLedgers.length === 0 ? <p>No 194O deductions generated yet.</p> : (
                 <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                       <thead>
                          <tr style={{ background: "#eee" }}>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Order ID</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Gross Value (Base)</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>TDS Section</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Rate</th>
                             <th style={{ padding: "0.75rem", border: "1px solid #ddd", color: "red" }}>Amount Deducted</th>
                          </tr>
                       </thead>
                       <tbody>
                          {tdsLedgers.map(t => (
                             <tr key={t.id}>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", fontSize: "0.85rem" }}>{t.orderId}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>₹{t.grossValueDeductedAgainst.toFixed(2)}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>{t.tdsSection}</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>{(t.tdsRate * 100).toFixed(2)}%</td>
                                <td style={{ padding: "0.75rem", border: "1px solid #ddd", color: "red", fontWeight: "bold" }}>₹{t.tdsAmountDeducted.toFixed(2)}</td>
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
