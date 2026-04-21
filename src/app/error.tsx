"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: "600px", textAlign: "center", marginTop: "10vh" }}>
        <h1 style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>⚠️</h1>
        <h2 className="dashboard-title">Something went wrong</h2>
        <p className="dashboard-subtitle" style={{ marginBottom: "var(--space-xl)" }}>
          We encountered an unexpected error while preparing your dashboard. 
          {error.digest && <span style={{ display: "block", fontSize: "0.85rem", opacity: 0.7, marginTop: "8px" }}>Error ID: {error.digest}</span>}
        </p>

        <div style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
          >
            Try again
          </button>
          <Link href="/login" className="btn btn-ghost">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
