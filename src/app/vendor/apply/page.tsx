"use client";

import { useAuth } from "@/lib/firebase/context";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VendorApplication() {
  const { user, role } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    gstin: "",
    pan: "",
    businessType: "retail",
    pickupAddress: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <div style={{ padding: "2rem" }}>Please login to apply.</div>;
  }
  if (role === 'vendor' || role === 'vendor_pending') {
    return <div style={{ padding: "2rem" }}>You have already applied or are a vendor.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const applicationId = `APP-VND-${Date.now()}`;
    const applicationDoc = doc(db, "vendorApplications", applicationId);

    try {
      await setDoc(applicationDoc, {
        applicationId,
        uid: user.uid,
        ...formData,
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
        <p>Your vendor application is under review. Please wait for admin approval.</p>
        <button onClick={() => router.push("/account")} style={{ padding: "0.5rem", marginTop: "1rem" }}>Go to Tracking Dashboard</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600, marginTop: "4rem" }}>
      <h1>Become a Vendor</h1>
      <p>Register your business on ByBy Marketplace.</p>
      
      {error && <div style={{ color: "red", padding: "1rem 0" }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" }}>
        <input type="text" placeholder="Registered Business Name" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} style={{ padding: "0.5rem" }} />
        <input type="text" placeholder="Owner Name" required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} style={{ padding: "0.5rem" }} />
        <input type="email" placeholder="Business Email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: "0.5rem" }} />
        <input type="tel" placeholder="Business Phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: "0.5rem" }} />
        
        <div style={{ display: "flex", gap: "1rem" }}>
          <input type="text" placeholder="GSTIN (15 Digits)" required value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})} maxLength={15} style={{ flex: 1, padding: "0.5rem" }} />
          <input type="text" placeholder="PAN" required value={formData.pan} onChange={e => setFormData({...formData, pan: e.target.value.toUpperCase()})} maxLength={10} style={{ flex: 1, padding: "0.5rem" }} />
        </div>

        <select value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} style={{ padding: "0.5rem" }}>
          <option value="retail">Retail Seller</option>
          <option value="wholesale">Wholesaler / Distributor</option>
          <option value="manufacturer">Manufacturer / D2C Brand</option>
        </select>

        <textarea placeholder="Primary Pickup Address" required value={formData.pickupAddress} onChange={e => setFormData({...formData, pickupAddress: e.target.value})} style={{ padding: "0.5rem", minHeight: "80px" }} />

        <button type="submit" disabled={loading} style={{ background: "black", color: "white", padding: "1rem", marginTop: "1rem" }}>
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
