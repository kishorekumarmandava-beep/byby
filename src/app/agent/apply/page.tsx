"use client";

import { useAuth } from "@/lib/firebase/context";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AgentApplication() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: user?.phoneNumber || "",
    email: user?.email || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    territoryCodes: "",
    aadhaarLast4: "",
    panNumberMasked: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <div style={{ padding: "2rem" }}>Please login to apply.</div>;
  }
  if (role === 'agent' || role === 'agent_pending') {
    return <div style={{ padding: "2rem" }}>You have already applied or are an agent.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const applicationId = `APP-AGT-${Date.now()}`;
    const applicationDoc = doc(db, "agentApplications", applicationId);

    try {
      await setDoc(applicationDoc, {
        applicationId,
        uid: user.uid,
        ...formData,
        territoryCodes: formData.territoryCodes.split(',').map(s => s.trim()),
        status: "submitted",
        submittedAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Failed to submit application. Ensure you are logged in correctly.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container" style={{ marginTop: "4rem", textAlign: "center" }}>
        <h2>Application Submitted Successfully</h2>
        <p>Your agent application is under review. Our admins will verify your details.</p>
        <button onClick={() => router.push("/account")} style={{ padding: "0.5rem", marginTop: "1rem" }}>Go to Tracking Dashboard</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600, marginTop: "4rem" }}>
      <h1>Become an Agent</h1>
      <p>Submit your details to partner with ByBy.</p>
      
      {error && <div style={{ color: "red", padding: "1rem 0" }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
        <input type="text" placeholder="Legal Full Name" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} style={{ padding: "0.5rem" }} />
        <input type="tel" placeholder="Phone Number" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: "0.5rem" }} />
        <input type="email" placeholder="Email Address" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: "0.5rem" }} />
        
        <input type="text" placeholder="Street Address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ padding: "0.5rem" }} />
        <div style={{ display: "flex", gap: "1rem" }}>
          <input type="text" placeholder="City" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} style={{ flex: 1, padding: "0.5rem" }} />
          <input type="text" placeholder="State" required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} style={{ flex: 1, padding: "0.5rem" }} />
          <input type="text" placeholder="Pincode" required value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} style={{ flex: 1, padding: "0.5rem" }} />
        </div>

        <input type="text" placeholder="Preferred Territory Pincodes (comma separated)" required value={formData.territoryCodes} onChange={e => setFormData({...formData, territoryCodes: e.target.value})} style={{ padding: "0.5rem" }} />
        
        <div style={{ display: "flex", gap: "1rem" }}>
          <input type="text" placeholder="Aadhaar Last 4 Digits" maxLength={4} required value={formData.aadhaarLast4} onChange={e => setFormData({...formData, aadhaarLast4: e.target.value})} style={{ flex: 1, padding: "0.5rem" }} />
          <input type="text" placeholder="PAN Number" required value={formData.panNumberMasked} onChange={e => setFormData({...formData, panNumberMasked: e.target.value})} style={{ flex: 1, padding: "0.5rem" }} />
        </div>

        <button type="submit" disabled={loading} style={{ background: "black", color: "white", padding: "1rem", marginTop: "1rem" }}>
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
