import "./globals.css";
import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Strategy DEX",
  description: "Trading strategy library + demo trade platform. SMC, indicators, memecoin, scalping & mean-reversion strategies.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <Nav />
          {children}
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="container" style={{ padding: "48px 24px", color: "var(--text-faint)", fontSize: 13, borderTop: "1px solid var(--border)", marginTop: 64 }}>
      <p className="mono">STRATEGY DEX · For demo purposes only, not financial advice.</p>
    </footer>
  );
}
