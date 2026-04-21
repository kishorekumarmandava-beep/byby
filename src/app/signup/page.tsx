"use client";

import { useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/context";

export default function SignupPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push("/account");
  }

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately set the display name
      await updateProfile(userCredential.user, { displayName: name });
      // Send Verification Email
      await sendEmailVerification(userCredential.user);
      
      setSuccess("Account created successfully. Please check your email to verify your account.");
      setTimeout(() => router.push("/account"), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: "4rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Create your account</h1>
      
      {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}
      {success && <div style={{ color: "green", marginBottom: "1rem" }}>{success}</div>}

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label>Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }} />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }} />
        </div>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          By creating an account, you agree to our <Link href="/legal/terms">Terms of Use</Link> and <Link href="/legal/privacy">Privacy Policy</Link>. You confirm you are 18+.
        </p>
        <button type="submit" disabled={loading} style={{ padding: "0.75rem", background: "#000", color: "#fff" }}>
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <p>Already have an account? <Link href="/login" style={{ color: "blue" }}>Log In</Link></p>
      </div>
    </div>
  );
}
