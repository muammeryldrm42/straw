"use client";
import { useState, useRef, useEffect } from "react";
import { SodexMarket } from "@/lib/useSodexMarkets";

export function SymbolPicker({ value, markets, onChange, disabled }: {
  value: string;
  markets: SodexMarket[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = markets.find((m) => (m.raw || `SODEX:${m.symbol}`) === value);
  const display = current ? current.symbol : (value.startsWith("SODEX:") ? value.slice(6) : value);
  const filtered = markets.filter((m) =>
    !q || m.symbol.toLowerCase().includes(q.toLowerCase()) || m.base.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="mono"
        style={{
          width: "100%", padding: "9px 10px", background: "var(--bg-soft)", color: "var(--text)",
          border: "1px solid var(--border-glow)", borderRadius: 5, fontSize: 13, textAlign: "left",
          cursor: disabled ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{display || "Select…"}</span>
        <span style={{ color: "var(--text-faint)", fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60,
          background: "var(--bg)", border: "1px solid var(--border-glow)", borderRadius: 6,
          boxShadow: "0 8px 28px rgba(0,0,0,.5)", overflow: "hidden",
        }}>
          <div style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search… (e.g. BTC)"
              className="mono"
              style={{
                width: "100%", padding: "7px 9px", background: "var(--bg-soft)", color: "var(--text)",
                border: "1px solid var(--border-glow)", borderRadius: 4, fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 && <div className="mono" style={{ padding: "12px", fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>No match</div>}
            {filtered.map((m) => {
              const sel = value === (m.raw || `SODEX:${m.symbol}`);
              return (
                <div
                  key={m.symbol}
                  onClick={() => { onChange(m.raw || `SODEX:${m.symbol}`); setOpen(false); setQ(""); }}
                  className="mono"
                  style={{
                    padding: "8px 12px", fontSize: 12, cursor: "pointer",
                    background: sel ? "var(--bg-soft)" : "transparent",
                    color: sel ? "var(--green)" : "var(--text)",
                    borderLeft: sel ? "2px solid var(--green)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-soft)"; }}
                  onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  {m.symbol}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
