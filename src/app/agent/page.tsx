"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/context";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function AgentDashboard() {
  const { user } = useAuth();
  
  const [agentData, setAgentData] = useState<any>(null);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!user) return;
      try {
        const agentDoc = await getDoc(doc(db, "agents", user.uid));
        if (agentDoc.exists()) {
           setAgentData(agentDoc.data());
        }

        const q = query(collection(db, "agentCommissions"), where("agentId", "==", user.uid));
        const snap = await getDocs(q);
        setLedgers(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgentData();
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={["agent"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <h1>Agent Dashboard</h1>
        {loading ? <p>Loading data...</p> : (
           <>
              <div style={{ padding: "1.5rem", background: "#f5f5f5", borderRadius: "8px", margin: "2rem 0" }}>
                 <p style={{ margin: 0, color: "gray" }}>Your Affiliate/Referral Code</p>
                 <h2 style={{ letterSpacing: "2px", margin: "0.5rem 0" }}>{agentData?.agentCode}</h2>
                 <p style={{ color: "green", fontWeight: "bold" }}>Total Processed Earnings: ₹{agentData?.stats?.commissionEarnedTotal?.toLocaleString() || 0}</p>
                 <p style={{ fontSize: "0.85rem", color: "gray" }}>Share this code with Vendors during their registration to earn commissions from their sales for life.</p>
              </div>

              <h3>Ledger / Payout History</h3>
              {ledgers.length === 0 ? <p>No commissions logged yet.</p> : (
                 <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
                    <thead>
                       <tr style={{ background: "#eee", textAlign: "left" }}>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Order ID</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Vendor ID</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Total Sales</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Gross Comm (2%)</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Less TDS (5%)</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Net Earned</th>
                          <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
                       </tr>
                    </thead>
                    <tbody>
                       {ledgers.map(l => (
                          <tr key={l.id}>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd", fontSize: "0.8rem" }}>{l.orderId}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd", fontSize: "0.8rem" }}>{l.vendorId}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>₹{l.totalSales}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>₹{l.grossCommission}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd", color: "red" }}>-₹{l.tdsAmount}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd", color: "green", fontWeight: "bold" }}>₹{l.netCommission}</td>
                             <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{l.status}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              )}
           </>
        )}
      </div>
    </ProtectedRoute>
  );
}
