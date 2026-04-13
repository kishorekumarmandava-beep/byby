"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "@/lib/firebaseClient";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from "firebase/auth";
import { syncFirebaseAuth } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds
const OTP_EXPIRY = 60; // seconds — Firebase OTPs typically expire in ~60s

export default function LoginPage() {
  // ── State ──────────────────────────────────────────
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  const [role, setRole] = useState("USER");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId = useRef<number | null>(null);
  const router = useRouter();

  // ── reCAPTCHA Setup (create ONCE, reuse) ───────────
  const getRecaptchaVerifier = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {
            // reCAPTCHA solved
          },
          "expired-callback": () => {
            // Reset the widget so it can be solved again
            if (recaptchaWidgetId.current !== null && (window as any).grecaptcha) {
              try {
                (window as any).grecaptcha.reset(recaptchaWidgetId.current);
              } catch { /* ignore */ }
            }
          },
        });
      } catch (err) {
        console.error("reCAPTCHA init error:", err);
        return null;
      }
    }

    return (window as any).recaptchaVerifier;
  }, []);

  // Render the reCAPTCHA widget once on mount
  useEffect(() => {
    const verifier = getRecaptchaVerifier();
    if (verifier) {
      verifier.render().then((widgetId: number) => {
        recaptchaWidgetId.current = widgetId;
      }).catch((err: any) => {
        console.error("reCAPTCHA render error:", err);
      });
    }

    return () => {
      // Cleanup on unmount only
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear(); } catch { /* ignore */ }
        (window as any).recaptchaVerifier = null;
      }
      recaptchaWidgetId.current = null;
    };
  }, [getRecaptchaVerifier]);

  // Helper: reset the grecaptcha widget (NOT the verifier) for retry
  const resetRecaptchaWidget = useCallback(() => {
    if (recaptchaWidgetId.current !== null && (window as any).grecaptcha) {
      try {
        (window as any).grecaptcha.reset(recaptchaWidgetId.current);
      } catch { /* ignore */ }
    }
  }, []);

  // ── Resend Timer ───────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── OTP Expiry Timer ───────────────────────────────
  useEffect(() => {
    if (otpExpiry <= 0) {
      if (step === "otp" && !otpExpired) {
        setOtpExpired(true);
        setError("OTP has expired. Please request a new one.");
      }
      return;
    }
    const id = setInterval(() => setOtpExpiry((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpExpiry, step, otpExpired]);

  // ── Handlers ───────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!termsAgreed) {
      setError("You must agree to the Terms & Conditions and confirm you are 18+.");
      return;
    }

    setLoading(true);
    try {
      // Reset the widget before each attempt (keeps the same verifier)
      resetRecaptchaWidget();
      
      const appVerifier = getRecaptchaVerifier();
      if (!appVerifier) {
        throw new Error("reCAPTCHA failed to initialize. Please refresh the page.");
      }
      
      const formattedPhone = `+91${cleaned}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep("otp");
      setResendTimer(RESEND_COOLDOWN);
      setOtpExpiry(OTP_EXPIRY);
      setOtpExpired(false);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setSuccessMsg(`OTP sent to +91 ${cleaned}`);

      // Focus the first OTP input after a short delay
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      console.error("Send OTP error:", err);
      const code = err?.code || "";
      if (code === "auth/captcha-check-failed" || code === "auth/invalid-app-credential") {
        setError("Security verification failed. Please refresh the page and try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a few minutes before trying again.");
      } else if (code === "auth/invalid-phone-number") {
        setError("Invalid phone number format. Please check and try again.");
      } else {
        setError(err?.message || "Failed to send OTP. Please try again.");
      }
      // Reset widget (not the whole verifier) for retry
      resetRecaptchaWidget();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError(null);
    setLoading(true);

    try {
      resetRecaptchaWidget();

      const cleaned = phone.replace(/\D/g, "");
      const formattedPhone = `+91${cleaned}`;
      const appVerifier = getRecaptchaVerifier();
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setResendTimer(RESEND_COOLDOWN);
      setOtpExpiry(OTP_EXPIRY);
      setOtpExpired(false);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setSuccessMsg("OTP re-sent successfully!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setError(err?.message || "Failed to resend OTP.");
      resetRecaptchaWidget();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join("");
      if (fullOtp.length === OTP_LENGTH) {
        handleVerifyOtp(fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    // Focus the next empty input, or the last one
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1;
    otpRefs.current[focusIdx]?.focus();

    // Auto-submit if fully pasted
    if (pasted.length === OTP_LENGTH) {
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (otpValue?: string) => {
    const otp = otpValue || otpDigits.join("");
    if (otp.length < OTP_LENGTH) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const firebaseResult = await confirmationResult!.confirm(otp);
      const idToken = await firebaseResult.user.getIdToken();

      const cleaned = phone.replace(/\D/g, "");
      const formattedPhone = `+91${cleaned}`;

      setSuccessMsg("Verified! Signing you in...");

      // Server action returns a result object instead of throwing
      const result = await syncFirebaseAuth(idToken, role, formattedPhone, name);

      if (result.success) {
        router.push(result.redirectTo);
      } else {
        setError(result.error);
        setSuccessMsg(null);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
      if (err?.code === "auth/invalid-verification-code") {
        setError("Invalid OTP. Please check and try again.");
      } else if (err?.code === "auth/code-expired") {
        setOtpExpired(true);
        setOtpExpiry(0);
        setError("OTP has expired. Please request a new one.");
      } else {
        setError(err?.message || "Verification failed. Please try again.");
      }
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep("phone");
    setError(null);
    setSuccessMsg(null);
    setOtpDigits(Array(OTP_LENGTH).fill(""));
    setConfirmationResult(null);
    setResendTimer(0);
    setOtpExpiry(0);
    setOtpExpired(false);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyOtp();
  };

  // ── Render ─────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in-scale">
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
          <div className="auth-logo-icon">📱</div>
          <h1 className="auth-title">Welcome to ByBy</h1>
          <p className="auth-subtitle">
            {step === "phone"
              ? "Sign in with your mobile number"
              : `Enter the code sent to +91 ${phone}`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step === "phone" ? "active" : "completed"}`}>
            {step === "otp" ? "✓" : "1"}
          </div>
          <div className="step-line">
            <div className={`step-line-fill ${step === "otp" ? "filled" : ""}`} />
          </div>
          <div className={`step-dot ${step === "otp" ? "active" : ""}`}>2</div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "var(--space-md)" }}>
            <span>⚠️</span> {error}
          </div>
        )}
        {successMsg && !error && (
          <div className="alert alert-success" style={{ marginBottom: "var(--space-md)" }}>
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container" ref={recaptchaContainerRef} />

        {/* ── STEP 1: Phone Number ── */}
        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="auth-form animate-fade-in">
            <div className="form-group">
              <label htmlFor="reg-name" className="form-label">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your Legal Name"
                className="form-input"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone" className="form-label">
                📱 Mobile Number{" "}
                <span className="badge badge-primary" style={{ marginLeft: "var(--space-xs)" }}>
                  Primary Login
                </span>
              </label>
              <div className="phone-input-group">
                <div className="phone-country-code">🇮🇳 +91</div>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                  minLength={10}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="9876543210"
                  className="form-input"
                  style={{ flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-role" className="form-label">
                I am a <span className="form-label-hint">(select your role)</span>
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="form-select"
              >
                <option value="USER">🛒 Buyer — Browse & Shop</option>
                <option value="VENDOR">📦 Vendor — Sell Products</option>
                <option value="AGENT">🤝 Agent — Refer & Earn</option>
                <option value="ADMIN">🛡️ Admin — Platform Oversight</option>
              </select>
            </div>

            {/* Terms & Age Consent */}
            <label className="consent-checkbox">
              <input
                type="checkbox"
                required
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                >
                  Terms of Use
                </Link>{" "}
                and Privacy Policy. I confirm that I am 18 years of age or older, or I am using
                this service with the involvement, supervision, and consent of a parent or guardian.
              </span>
            </label>

            {/* WhatsApp Consent */}
            <label
              className="consent-checkbox"
              style={{
                background: whatsappConsent ? "rgba(37, 211, 102, 0.08)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                style={{ accentColor: "#25D366" }}
              />
              <span>
                <strong style={{ color: "#25D366" }}>📩 WhatsApp</strong> Send me order updates
                and offers.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !termsAgreed}
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: "var(--space-sm)" }}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" /> Sending OTP...
                </span>
              ) : (
                "Get OTP →"
              )}
            </button>

            <p className="auth-footer-text">
              Your phone number is your identity on ByBy.
              <br />
              We&apos;ll send a one-time verification code via SMS.
            </p>
          </form>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === "otp" && (
          <form onSubmit={handleVerifySubmit} className="auth-form animate-fade-in">
            {/* OTP Expiry Banner */}
            {otpExpired && (
              <div className="otp-expired-banner animate-fade-in">
                <div className="otp-expired-icon">⏰</div>
                <p className="otp-expired-text">Your OTP has expired</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendTimer > 0}
                  className="btn btn-primary btn-full"
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" /> Sending...
                    </span>
                  ) : resendTimer > 0 ? (
                    `Resend in ${resendTimer}s`
                  ) : (
                    "🔄 Resend OTP"
                  )}
                </button>
              </div>
            )}

            {/* OTP Digit Boxes */}
            <div className={`otp-input-group ${otpExpired ? "otp-disabled" : ""}`} onPaste={otpExpired ? undefined : handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`otp-digit-input ${digit ? "filled" : ""} ${otpExpired ? "expired" : ""}`}
                  autoFocus={i === 0}
                  aria-label={`OTP digit ${i + 1}`}
                  disabled={otpExpired}
                />
              ))}
            </div>

            {/* Expiry countdown */}
            {!otpExpired && otpExpiry > 0 && (
              <p className="otp-expiry-countdown">
                Code expires in <strong>{otpExpiry}s</strong>
              </p>
            )}

            {!otpExpired && (
              <button
                type="submit"
                disabled={loading || otpDigits.join("").length < OTP_LENGTH}
                className="btn btn-primary btn-lg btn-full"
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" /> Verifying...
                  </span>
                ) : (
                  "Verify & Login ✓"
                )}
              </button>
            )}

            {/* Resend & Change Number */}
            <div className="otp-actions">
              {!otpExpired && (
                <>
                  {resendTimer > 0 ? (
                    <p className="resend-timer">
                      Resend OTP in <strong>{resendTimer}s</strong>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="btn btn-ghost btn-sm"
                    >
                      🔄 Resend OTP
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={handleChangeNumber}
                className="btn btn-ghost btn-sm"
              >
                ← Change Number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
