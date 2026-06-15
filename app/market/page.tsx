"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

interface Row {
  id: string; display: string; base: string; price: number; change: number;
  category: "crypto" | "stocks" | "commodities" | "index" | "ssi"; source: "binance" | "sodex";
}

// SoDEX RWA (tokenize hisse) sembolleri — Market'te ayrı "RWA" sekmesinde süzülür. categorize/lib'e dokunulmaz; diğer kategoriler değişmez.
const RWA_SYMBOLS = ["SKHYNIX", "TSM", "TSLA", "SNDK", "SAMSUNG", "PLTR", "ORCL", "NVDA", "MU", "MSFT", "META", "INTC", "GOOGL", "AMZN", "AMD", "AAPL", "SPCX"];
const isRwa = (base: string) => RWA_SYMBOLS.includes((base || "").toUpperCase());

const CATS: { key: string; label: string }[] = [
  { key: "all", label: "market.all" },
  { key: "crypto", label: "market.crypto" },
  { key: "rwa", label: "market.rwa" },
  { key: "stocks", label: "market.stocks" },
  { key: "commodities", label: "market.commodities" },
  { key: "index", label: "market.index" },
  { key: "ssi", label: "market.ssi" },
];

function fmtPrice(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toPrecision(4);
}

export default function MarketPage() {
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const load = () => {
    fetch("/api/market-tickers")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.rows)) setRows(d.rows); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  const available = new Set(rows.map((r) => r.category));
  const hasRwa = rows.some((r) => isRwa(r.base));
  const cats = CATS.filter((c) => c.key === "all" || (c.key === "rwa" ? hasRwa : available.has(c.key as any)));
  const filtered = rows
    .filter((r) => cat === "all" || (cat === "rwa" ? isRwa(r.base) : r.category === cat))
    .filter((r) => !q || r.display.toLowerCase().includes(q.toLowerCase()) || r.base.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.price - a.price);

  const catCount = (k: string) => (k === "all" ? rows.length : k === "rwa" ? rows.filter((r) => isRwa(r.base)).length : rows.filter((r) => r.category === k).length);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 className="display" style={{ fontSize: 26 }}>{t("market.title")}</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>{t("market.subtitle")}</p>
      </div>

      {/* Kategori sekmeleri + arama */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {cats.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)} className="mono" style={{
            padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
            background: cat === c.key ? "var(--green)" : "var(--bg-soft)",
            color: cat === c.key ? "#04150d" : "var(--text-dim)",
            border: "1px solid " + (cat === c.key ? "transparent" : "var(--border-glow)"),
          }}>{t(c.label)} <span style={{ opacity: .6 }}>{catCount(c.key)}</span></button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("market.search")} className="mono"
          style={{ marginLeft: "auto", padding: "7px 10px", background: "var(--bg-soft)", color: "var(--text)", border: "1px solid var(--border-glow)", borderRadius: 6, fontSize: 12, minWidth: 140 }} />
      </div>

      {loading && rows.length === 0 ? (
        <div className="panel" style={{ padding: 28, textAlign: "center", color: "var(--text-dim)" }}><span className="pulse">{t("market.loading")}</span></div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>
                <th style={th}>{t("market.asset")}</th>
                <th style={{ ...th, textAlign: "right" }}>{t("market.price")}</th>
                <th style={{ ...th, textAlign: "right" }}>24h %</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{r.display}</span>
                        <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px" }}>{r.source === "sodex" ? "SoDEX" : "SoDEX"}</span>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "right" }} className="mono">${fmtPrice(r.price)}</td>
                    <td style={{ ...td, textAlign: "right", color: r.change >= 0 ? "var(--green)" : "var(--red)" }} className="mono">{r.change >= 0 ? "+" : ""}{r.change.toFixed(2)}%</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <a href={r.id.startsWith("SODEX_SPOT:") ? `https://sodex.com/trade/spot/${r.base}_USDC` : `https://sodex.com/trade/futures/${r.id.replace("SODEX:", "")}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, border: "1px solid rgba(0,230,150,.4)", color: "var(--green)", whiteSpace: "nowrap" }}>SoDEX ↗</a>
                        {r.base && r.base.toLowerCase().includes("mag7") && (
                        <a href="https://sodex.com/vault" target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, border: "1px solid var(--purple)", color: "var(--purple)", whiteSpace: "nowrap" }}>Vault ↗</a>
                        )}
                        {r.category === "ssi" ? (
                        <Link href="/signals?scope=ssi" className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, border: "1px solid var(--border-glow)", color: "var(--accent)", whiteSpace: "nowrap" }}>{t("nav.signals")}</Link>
                        ) : r.id.startsWith("SODEX_SPOT:") ? (
                        <Link href={`/signals?symbol=${encodeURIComponent(r.base + "USDT")}`} className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, border: "1px solid var(--border-glow)", color: "var(--accent)", whiteSpace: "nowrap" }}>{t("nav.signals")}</Link>
                        ) : (<>
                        <Link href={`/signals?symbol=${encodeURIComponent(r.id)}`} className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, border: "1px solid var(--border-glow)", color: "var(--accent)", whiteSpace: "nowrap" }}>{t("nav.signals")}</Link>
                        <Link href={`/demo?symbol=${encodeURIComponent(r.id)}`} className="mono" style={{ fontSize: 11, padding: "5px 9px", borderRadius: 5, background: "var(--green)", color: "#04150d", whiteSpace: "nowrap", fontWeight: 700 }}>{t("market.run_demo")}</Link>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)" }}>{t("market.empty")}</div>}
        </div>
      )}
      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 10 }}>{t("market.refresh_note")}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", color: "var(--text-faint)", fontSize: 10, fontFamily: "monospace", letterSpacing: ".05em" };
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle" };
