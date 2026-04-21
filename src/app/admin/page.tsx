"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/context";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [vendorApps, setVendorApps] = useState<any[]>([]);
  const [agentApps, setAgentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const vQuery = query(collection(db, "vendorApplications"), where("status", "==", "submitted"));
        const vSnapshot = await getDocs(vQuery);
        setVendorApps(vSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const aQuery = query(collection(db, "agentApplications"), where("status", "==", "submitted"));
        const aSnapshot = await getDocs(aQuery);
        setAgentApps(aSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to fetch applications:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, []);

  const handleApprove = async (collectionName: string, docId: string) => {
    if (!window.confirm(`Are you sure you want to approve this ${collectionName === 'vendorApplications' ? 'Vendor' : 'Agent'}?`)) return;
    
    try {
      const ref = doc(db, collectionName, docId);
      await updateDoc(ref, {
        status: "approved",
        reviewedBy: user?.uid || "admin",
        reviewedAt: new Date()
      });
      // Filter out locally
      if (collectionName === "vendorApplications") {
        setVendorApps(prev => prev.filter(app => app.id !== docId));
      } else {
        setAgentApps(prev => prev.filter(app => app.id !== docId));
      }
      alert("Approved successfully! The respective Cloud Function will assign custom claims.");
    } catch (err) {
      console.error(err);
      alert("Failed to approve.");
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <h1>Admin Dashboard</h1>
        <p>Review and act upon pending applications.</p>

        {loading ? (
          <p>Loading applications...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem" }}>
            
            {/* Vendor Applications */}
            <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
              <h2>Vendor Applications ({vendorApps.length})</h2>
              {vendorApps.length === 0 && <p>No pending vendor applications.</p>}
              {vendorApps.map(app => (
                <div key={app.id} style={{ borderBottom: "1px solid #eee", padding: "1rem 0" }}>
                  <strong>{app.businessName}</strong> ({app.businessType})
                  <div style={{ fontSize: "0.85rem", margin: "0.5rem 0" }}>
                    <p>Owner: {app.ownerName}</p>
                    <p>GSTIN: {app.gstin}</p>
                    <p>Contact: {app.email} | {app.phone}</p>
                  </div>
                  <button onClick={() => handleApprove("vendorApplications", app.id)} style={{ background: "green", color: "white", padding: "0.5rem 1rem", border: "none", cursor: "pointer" }}>
                    Approve Vendor
                  </button>
                </div>
              ))}
            </div>

            {/* Agent Applications */}
            <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
              <h2>Agent Applications ({agentApps.length})</h2>
              {agentApps.length === 0 && <p>No pending agent applications.</p>}
              {agentApps.map(app => (
                <div key={app.id} style={{ borderBottom: "1px solid #eee", padding: "1rem 0" }}>
                  <strong>{app.fullName}</strong>
                  <div style={{ fontSize: "0.85rem", margin: "0.5rem 0" }}>
                    <p>Territories: {app.territoryCodes?.join(", ")}</p>
                    <p>Contact: {app.email} | {app.phone}</p>
                  </div>
                  <button onClick={() => handleApprove("agentApplications", app.id)} style={{ background: "blue", color: "white", padding: "0.5rem 1rem", border: "none", cursor: "pointer" }}>
                    Approve Agent
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
