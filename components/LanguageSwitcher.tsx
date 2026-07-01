"use client";
import { useState, useRef, useEffect } from "react";
import { LANGUAGES, useT, Lang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change language"
        style={{
          background: "var(--bg-soft)",
          border: "1px solid var(--border-glow)",
          borderRadius: 6,
          padding: "5px 9px",
          color: "var(--text)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-glow)"; }}
      >
        {current.label}
        <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          background: "var(--bg)",
          border: "1px solid var(--border-glow)",
          borderRadius: 8,
          padding: 4,
          minWidth: 160,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,157,0.08)",
          zIndex: 100,
        }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code as Lang); setOpen(false); }}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                background: lang === l.code ? "var(--bg-soft)" : "transparent",
                border: "none",
                borderRadius: 4,
                color: lang === l.code ? "var(--green)" : "var(--text)",
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (lang !== l.code) e.currentTarget.style.background = "var(--bg-soft)"; }}
              onMouseLeave={(e) => { if (lang !== l.code) e.currentTarget.style.background = "transparent"; }}
            >
              <span>{l.native}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "var(--text-faint)",
                fontWeight: 700,
              }}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
