import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata: Metadata = {
  title: "ByBy — Indian E-Commerce Marketplace",
  description: "India's compliant marketplace for courses, electronics, apparel & more. Shop with GST compliance, TDS tracking, and verified vendors.",
  keywords: "e-commerce, India, marketplace, GST, TDS, online shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <footer className="footer">
          <div className="container">
            <div className="footer-links">
              <a href="#">About</a>
              <a href="#">Seller Hub</a>
              <a href="#">Compliance</a>
              <a href="#">Support</a>
            </div>
            <p>© {new Date().getFullYear()} ByBy Marketplace · Indian-law compliant</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
