"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/firebase/context";
import { auth } from "@/lib/firebaseClient";
import { signOut } from "firebase/auth";

export default function CustomerDashboard() {
  const { user, role } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["customer"]}>
      <div className="container" style={{ marginTop: "4rem" }}>
        <h1>My Account</h1>
        <p>Welcome back, {user?.displayName || user?.phoneNumber || user?.email}</p>
        <p>Your Role: <strong>{role}</strong></p>
        
        <div style={{ marginTop: "2rem" }}>
          <button onClick={() => signOut(auth)} style={{ padding: "0.5rem 1rem", background: "red", color: "white" }}>
            Sign Out
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
