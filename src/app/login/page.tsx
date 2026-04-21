"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebaseClient";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/context";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function LoginPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (role === "admin") router.push("/admin");
      else if (role === "vendor") router.push("/vendor/dashboard");
      else if (role === "agent") router.push("/agent/dashboard");
      else router.push("/account"); // customers or pending
    }
  }, [user, role, authLoading, router]);

  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"input" | "otp">("input");
  
  // Phone State
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // Email State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId = useRef<number | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getRecaptchaVerifier = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return (window as any).recaptchaVerifier;
  }, []);

  useEffect(() => {
    if (method === "phone" && step === "input") {
       const verifier = getRecaptchaVerifier();
       verifier?.render().then((id: number) => { recaptchaWidgetId.current = id; });
    }
    return () => {
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch {}
        (window as any).recaptchaVerifier = null;
      }
    };
  }, [method, step, getRecaptchaVerifier]);

  // Phone submission
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) return setError("Enter a valid 10-digit number.");
    
    setLoading(true);
    try {
      if ((window as any).grecaptcha && recaptchaWidgetId.current !== null) {
        (window as any).grecaptcha.reset(recaptchaWidgetId.current);
      }
      const appVerifier = getRecaptchaVerifier();
      const formattedPhone = `+91${cleaned}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep("otp");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length < OTP_LENGTH) return setError("Incomplete OTP.");
    
    setLoading(true);
    try {
      await confirmationResult!.confirm(otp);
      // user will be caught by useEffect naturally
    } catch (err: any) {
      setError("Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Email submission
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: "4rem" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Login to ByBy</h1>
      
      {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => { setMethod("phone"); setStep("input"); }} style={{ flex: 1, padding: "0.5rem" }} disabled={method === "phone"}>Phone OTP</button>
        <button onClick={() => { setMethod("email"); setStep("input"); }} style={{ flex: 1, padding: "0.5rem" }} disabled={method === "email"}>Email / Password</button>
      </div>

      <div id="recaptcha-container" ref={recaptchaContainerRef} />

      {method === "phone" && step === "input" && (
        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Mobile Number</label>
            <div style={{ display: "flex", marginTop: "0.5rem" }}>
              <span style={{ padding: "0.75rem", background: "#eee" }}>+91</span>
              <input type="tel" style={{ flex: 1, padding: "0.75rem" }} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ padding: "0.75rem", background: "#000", color: "#fff" }}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {method === "phone" && step === "otp" && (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label>Enter 6-digit OTP</label>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
            {otpDigits.map((d, i) => (
              <input key={i} type="text" maxLength={1} value={d}
                ref={el => { otpRefs.current[i] = el; }}
                onChange={e => {
                  const newD = [...otpDigits]; newD[i] = e.target.value.slice(-1); setOtpDigits(newD);
                  if (e.target.value && i < OTP_LENGTH - 1) otpRefs.current[i+1]?.focus();
                }}
                style={{ width: "3rem", height: "3rem", textAlign: "center", fontSize: "1.5rem" }}
              />
            ))}
          </div>
          <button type="submit" disabled={loading} style={{ padding: "0.75rem", background: "#000", color: "#fff" }}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
      )}

      {method === "email" && (
        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: "0.75rem", background: "#000", color: "#fff" }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      )}

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <p>Don&apos;t have an account? <Link href="/signup" style={{ color: "blue" }}>Sign Up</Link></p>
      </div>
    </div>
  );
}
