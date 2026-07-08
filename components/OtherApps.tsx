"use client";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n";

// Diğer app'ler — SoSoValue / SoDEX ekosistemi için yapılan araçlar.
// Yeni app eklemek için buraya bir satır ekle (name + href). Harici linkler yeni sekmede açılır.
const APPS: { name: string; href: string; external?: boolean }[] = [
  { name: "SoPoints Calculator", href: "https://sodex-calculator.vercel.app/", external: true },
];

export default function OtherApps() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`nav-link ${open ? "active" : ""}`}
        style={{ background: "transparent", border: "none", cursor: "pointer", font: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}
      >
        {t("nav.other_apps")}
        <span style={{ fontSize: 10, opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 220, zIndex: 50,
            background: "var(--bg-soft, #0f0f14)", border: "1px solid var(--border, #262630)",
            borderRadius: 10, padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          {APPS.map((a) => (
            <a
              key={a.name}
              href={a.href}
              target={a.external ? "_blank" : undefined}
              rel={a.external ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                padding: "10px 12px", borderRadius: 7, color: "var(--text, #e6e6ea)",
                fontSize: 13.5, textDecoration: "none", transition: "background .12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>{a.name}</span>
              {a.external && <span style={{ fontSize: 11, opacity: 0.5 }}>↗</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
