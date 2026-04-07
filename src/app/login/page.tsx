"use client";

import { useState } from "react";
import { auth } from "@/lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { syncFirebaseAuth } from "./actions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("USER");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const router = useRouter();

  // Handle LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      const navigateTo = await syncFirebaseAuth(idToken, role, null);
      router.push(navigateTo);
    } catch (err: any) {
      const code = err?.code || "";
      const messages: Record<string, string> = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Try again.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Invalid credentials. Check your email and password.",
        "auth/configuration-not-found": "Authentication is not configured. Please contact admin.",
      };
      setError(messages[code] || err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  // Handle REGISTRATION — create account with email + phone stored
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate phone
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      // Create Firebase account with email/password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Sync to backend with phone number
      const formattedPhone = `+91${cleaned}`;
      const navigateTo = await syncFirebaseAuth(idToken, role, formattedPhone);
      router.push(navigateTo);
    } catch (err: any) {
      const code = err?.code || "";
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "This email is already registered. Try signing in.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/configuration-not-found": "Authentication is not configured. Please contact admin.",
      };
      setError(messages[code] || err.message || "Registration failed.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email first to receive the reset link.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale">
        {/* ===== LOGIN MODE ===== */}
        {!isRegistering && (
          <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your ByBy account</p>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "var(--space-md)" }}>
                <span>⚠️</span> {error}
              </div>
            )}
            {resetSent && (
              <div className="alert alert-success" style={{ marginBottom: "var(--space-md)" }}>
                <span>✉️</span> Password reset email sent!
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email</label>
                <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="login-password" className="form-label">Password</label>
                <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="form-input" />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full" style={{ marginTop: "var(--space-sm)" }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-xl)", alignItems: "center" }}>
              <div className="divider-text" style={{ width: "100%" }}><span>New to ByBy?</span></div>
              <button onClick={() => { setIsRegistering(true); setError(null); setResetSent(false); }} className="btn btn-ghost" style={{ color: "var(--color-info)" }}>
                Create an account
              </button>
              <button onClick={handleForgotPassword} className="btn btn-ghost btn-sm" style={{ color: "var(--text-tertiary)" }}>
                Forgot password?
              </button>
            </div>
          </>
        )}

        {/* ===== REGISTER MODE ===== */}
        {isRegistering && (
          <>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join India&apos;s compliant marketplace</p>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "var(--space-md)" }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label htmlFor="reg-email" className="form-label">Email</label>
                <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">Password</label>
                <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="form-input" />
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label htmlFor="reg-phone" className="form-label">
                  📱 WhatsApp Number <span className="badge badge-primary" style={{ marginLeft: "var(--space-xs)" }}>Required</span>
                </label>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <div style={{
                    display: "flex", alignItems: "center", padding: "0 0.75rem",
                    background: "var(--bg-tertiary)", border: "1.5px solid var(--border-primary)",
                    borderRadius: "var(--radius-md)", fontSize: "0.9rem", fontWeight: 600,
                    color: "var(--text-secondary)", whiteSpace: "nowrap",
                  }}>
                    🇮🇳 +91
                  </div>
                  <input
                    id="reg-phone" type="tel" value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required minLength={10} maxLength={10} pattern="[0-9]{10}"
                    placeholder="9876543210" className="form-input" style={{ flex: 1 }}
                  />
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
                  For order updates and exclusive offers via WhatsApp
                </span>
              </div>

              {/* WhatsApp Consent */}
              <label
                htmlFor="whatsapp-consent"
                style={{
                  display: "flex", alignItems: "flex-start", gap: "var(--space-sm)",
                  cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)",
                  padding: "var(--space-sm) var(--space-md)",
                  background: whatsappConsent ? "rgba(37, 211, 102, 0.08)" : "var(--bg-tertiary)",
                  border: whatsappConsent ? "1.5px solid rgba(37, 211, 102, 0.3)" : "1.5px solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  transition: "all var(--transition-fast)",
                }}
              >
                <input
                  id="whatsapp-consent"
                  type="checkbox"
                  checked={whatsappConsent}
                  onChange={(e) => setWhatsappConsent(e.target.checked)}
                  style={{ marginTop: "2px", accentColor: "#25D366", width: "18px", height: "18px" }}
                />
                <span>
                  <strong style={{ color: "#25D366" }}>📩 I agree</strong> to receive order updates, deals, and promotions via WhatsApp. You can opt out anytime.
                </span>
              </label>

              <div className="form-group">
                <label htmlFor="reg-role" className="form-label">
                  I am a <span className="form-label-hint">(select your role)</span>
                </label>
                <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} required className="form-select">
                  <option value="USER">🛒 Buyer — Browse & Shop</option>
                  <option value="VENDOR">📦 Vendor — Sell Products</option>
                  <option value="AGENT">🤝 Agent — Refer & Earn</option>
                  <option value="ADMIN">🛡️ Admin — Platform Oversight</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full" style={{ marginTop: "var(--space-sm)" }}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-xl)", alignItems: "center" }}>
              <div className="divider-text" style={{ width: "100%" }}><span>Already have an account?</span></div>
              <button onClick={() => { setIsRegistering(false); setError(null); }} className="btn btn-ghost" style={{ color: "var(--color-info)" }}>
                Sign in instead
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
