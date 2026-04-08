"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebaseClient";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithEmailAndPassword
} from "firebase/auth";
import { syncFirebaseAuth } from "./actions";
import { useRouter } from "next/navigation";
import Link from 'next/link';

export default function LoginPage() {
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [role, setRole] = useState("USER");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    // Initialize RecaptchaVerifier once on mount if we're using Phone Auth
    if (typeof window !== "undefined" && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!name.trim()) {
      setError("Please provide your Full Name.");
      return;
    }

    if (!termsAgreed) {
      setError("You must agree to the Terms & Conditions and confirm you are 18+ to proceed.");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = `+91${cleaned}`;
      const appVerifier = (window as any).recaptchaVerifier;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to send OTP. Try again.");
      // Reset reCAPTCHA so they can try again
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const result = await confirmationResult!.confirm(otp);
      const idToken = await result.user.getIdToken();
      
      const cleaned = phone.replace(/\D/g, "");
      const formattedPhone = `+91${cleaned}`;
      const navigateTo = await syncFirebaseAuth(idToken, role, formattedPhone, name);
      router.push(navigateTo);
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
      if (err?.code === 'auth/invalid-verification-code') {
         setError("Invalid OTP code. Please check and try again.");
      } else {
         setError(err?.message || "Server Error: Could not complete login. Check console.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      // Email auth fallback doesn't mandate name/phone upfront in the UI here to keep it simple,
      // but passes empty strings.
      const navigateTo = await syncFirebaseAuth(idToken, role, "", "");
      router.push(navigateTo);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Invalid credentials.",
      };
      setError(msgs[err?.code] || err.message || "Login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale">
        <h1 className="auth-title">Welcome to ByBy</h1>
        <p className="auth-subtitle">India&apos;s compliant e-commerce marketplace</p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "var(--space-md)" }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div id="recaptcha-container"></div>

        {method === "phone" && !showOtpInput && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">Full Name</label>
              <input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your Legal Name" className="form-input" />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label">
                📱 Mobile Number <span className="badge badge-primary" style={{ marginLeft: "var(--space-xs)" }}>Required</span>
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
            </div>

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

            {/* Terms and Age Consent */}
            <label className="checkbox-label" style={{
                display: "flex", alignItems: "flex-start", gap: "var(--space-sm)",
                cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)",
                padding: "var(--space-sm)", background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)"
              }}>
              <input type="checkbox" required checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} style={{ marginTop: "3px", width: "16px", height: "16px" }} />
              <span>
                I agree to the <Link href="/terms" target="_blank" style={{color: "var(--color-primary)", textDecoration: "underline"}}>Terms of Use</Link> and Privacy Policy. I confirm that I am 18 years of age or older, or I am using this service with the involvement, supervision, and consent of a parent or guardian.
              </span>
            </label>

            {/* WhatsApp Consent */}
            <label style={{
                display: "flex", alignItems: "flex-start", gap: "var(--space-sm)",
                cursor: "pointer", fontSize: "0.85rem", color: "var(--text-secondary)",
                padding: "var(--space-sm)",
                background: whatsappConsent ? "rgba(37, 211, 102, 0.08)" : "transparent",
                borderRadius: "var(--radius-md)",
              }}>
              <input type="checkbox" checked={whatsappConsent} onChange={(e) => setWhatsappConsent(e.target.checked)} style={{ marginTop: "2px", accentColor: "#25D366", width: "16px", height: "16px" }} />
              <span><strong style={{ color: "#25D366" }}>📩 WhatsApp</strong> Send me order updates and offers.</span>
            </label>

            <button type="submit" disabled={loading || !termsAgreed} className="btn btn-primary btn-lg btn-full" style={{ marginTop: "var(--space-sm)" }}>
              {loading ? "Sending OTP..." : "Get OTP"}
            </button>
          </form>
        )}

        {method === "phone" && showOtpInput && (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
             <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textAlign: "center" }}>
               We've sent a 6-digit verification code to <strong>+91 {phone}</strong>
             </p>
             <div className="form-group">
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="••••••" className="form-input" style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px" }} />
             </div>
             <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button type="button" onClick={() => setShowOtpInput(false)} className="btn btn-ghost btn-sm" style={{ marginTop: "var(--space-sm)" }}>
              Change Phone Number
            </button>
          </form>
        )}

        {/* Fallback to Email Login */}
        {method === "email" && (
           <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
             <div className="form-group">
               <label htmlFor="login-email" className="form-label">Email</label>
               <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="form-input" />
             </div>
             <div className="form-group">
               <label htmlFor="login-password" className="form-label">Password</label>
               <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="form-input" />
             </div>
             <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full" style={{ marginTop: "var(--space-sm)" }}>
               {loading ? "Signing in..." : "Sign In with Email"}
             </button>
           </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-xl)", alignItems: "center" }}>
          <div className="divider-text" style={{ width: "100%" }}><span>OR</span></div>
          {method === "phone" ? (
             <button onClick={() => { setMethod("email"); setError(null); }} className="btn btn-ghost btn-sm">
               Continue with Email instead
             </button>
          ) : (
             <button onClick={() => { setMethod("phone"); setError(null); }} className="btn btn-ghost btn-sm">
               Login / Register via Phone
             </button>
          )}
        </div>

      </div>
    </div>
  );
}
