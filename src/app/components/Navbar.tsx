"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isHome = pathname === "/";
  const pathSegments = pathname.split("/").filter(Boolean);

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" className="navbar-brand">
            ByBy
          </Link>

          {/* Breadcrumbs (desktop) */}
          {!isHome && pathSegments.length > 0 && (
            <div className="navbar-breadcrumbs" style={{ display: "var(--breadcrumb-display, flex)" }}>
              <button
                onClick={() => router.back()}
                className="btn-ghost"
                style={{ 
                  padding: "0.25rem 0.5rem", 
                  fontSize: "0.8rem", 
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: "transparent",
                  color: "var(--text-secondary)"
                }}
              >
                ← Back
              </button>
              <span style={{ color: "var(--text-tertiary)" }}>/</span>
              {pathSegments.map((segment, index) => {
                const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
                const isLast = index === pathSegments.length - 1;
                return (
                  <span key={url} style={{ display: "flex", alignItems: "center", gap: "0.25rem", textTransform: "capitalize" }}>
                    {isLast ? (
                      <span className="current">{segment}</span>
                    ) : (
                      <>
                        <Link href={url}>{segment}</Link>
                        <span style={{ color: "var(--text-tertiary)" }}>/</span>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side links */}
        <div className="navbar-links">
          <Link href="/" className={`navbar-link${pathname === "/" ? " active" : ""}`}>
            🏠 Home
          </Link>
          <Link href="/login" className={`navbar-link${pathname === "/login" ? " active" : ""}`}>
            👤 Account
          </Link>
        </div>
      </div>
    </nav>
  );
}
