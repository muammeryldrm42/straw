"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

interface Index { ticker: string; price: number; change24h: number; roi7d: number; roi1m: number; roi3m: number; ytd: number; }
interface MacroDay { date: string; events: string[]; }

// Ticker (ssimag7) -> görünen isim (MAG7.ssi)
function prettyName(ticker: string): string {
  const m = (ticker || "").toLowerCase().match(/^ssi(.+)$/);
  return m ? `${m[1].toUpperCase()}.ssi` : ticker.toUpperCase();
}
// SoDEX'te listeli olanlar için spot trade linki (ticker ssimag7 -> MAG7ssi_USDC)
function sodexLink(ticker: string): string | null {
  const m = (ticker || "").toLowerCase().match(/^ssi(.+)$/);
  if (!m) return null;
  const core = m[1].toUpperCase();
  const map: Record<string, string> = { MAG7: "MAG7ssi", MEME: "MEMEssi", DEFI: "DEFIssi" };
  return map[core] ? `https://sodex.com/trade/spot/${map[core]}_USDC` : null;
}

function fmtPrice(n: number): string {
  if (!isFinite(n) || n === 0) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// gelen değer oran (0.275 = %27.5)
function fmtPct(r: number): string {
  const n = r * 100;
  if (!isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function pctColor(r: number): string {
  return r > 0 ? "var(--green)" : r < 0 ? "var(--red)" : "var(--text-dim)";
}
function toMs(d: string): number {
  const p = Date.parse(d);
  return isNaN(p) ? 0 : p;
}

// klines close değerlerinden basit çizgi grafiği path'i
function sparklinePath(klines: { t: number; c: number }[], w: number, h: number, pad = 4): { line: string; up: boolean } {
  if (klines.length < 2) return { line: "", up: true };
  const cs = klines.map((k) => k.c);
  const min = Math.min(...cs), max = Math.max(...cs);
  const range = max - min || 1;
  const n = klines.length;
  const pts = klines.map((k, i) => {
    const x = pad + (i / (n - 1)) * (w - 2 * pad);
    const y = h - pad - ((k.c - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { line: `M ${pts.join(" L ")}`, up: cs[cs.length - 1] >= cs[0] };
}

export default function IntelPage() {
  const { t } = useT();
  const [indices, setIndices] = useState<Index[]>([]);
  const [macro, setMacro] = useState<MacroDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // detay modalı
  const [selected, setSelected] = useState<Index | null>(null);
  const [detail, setDetail] = useState<{ klines: { t: number; c: number }[]; constituents: { symbol: string; weight: number }[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch("/api/intel");
        const d = await r.json();
        if (d.error) setErr(d.error);
        setIndices(d.indices || []);
        setMacro(d.macro || []);
      } catch { setErr("exception"); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    (async () => {
      setDetailLoading(true); setDetail(null);
      try {
        const r = await fetch(`/api/intel/index?ticker=${encodeURIComponent(selected.ticker)}`);
        const d = await r.json();
        setDetail({ klines: d.klines || [], constituents: d.constituents || [] });
      } catch { setDetail({ klines: [], constituents: [] }); } finally { setDetailLoading(false); }
    })();
  }, [selected]);

  // Esc ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const todayMs = new Date(new Date().toDateString()).getTime();
  const sortedMacro = [...macro].map((m) => ({ ...m, ms: toMs(m.date) })).filter((m) => m.ms > 0).sort((a, b) => a.ms - b.ms);
  const nextDay = sortedMacro.find((m) => m.ms >= todayMs);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <h1 className="display" style={{ fontSize: 26 }}>{t("intel.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 4, marginBottom: 4 }}>{t("intel.subtitle")}</p>
      <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 0, marginBottom: 22 }}>{t("intel.disclaimer")}</p>

      {loading && <p className="mono" style={{ color: "var(--text-dim)" }}>{t("intel.loading")}</p>}
      {err === "no-key" && <p className="mono" style={{ color: "var(--amber)" }}>{t("intel.no_key")}</p>}

      {/* ===== SSI ENDEKSLERİ ===== */}
      {!loading && (
        <section style={{ marginBottom: 38 }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--accent)", marginBottom: 12 }}>📊 {t("intel.ssi_title").toUpperCase()}</div>
          {indices.length === 0 ? (
            <p className="mono" style={{ color: "var(--text-faint)", fontSize: 13 }}>{t("intel.no_ssi")}</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {indices.map((ix) => {
                const link = sodexLink(ix.ticker);
                return (
                  <div key={ix.ticker} onClick={() => setSelected(ix)} className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer", transition: "border-color .15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ fontSize: 14, color: "var(--text)", fontWeight: 700 }}>{prettyName(ix.ticker)}</span>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mono"
                          style={{ fontSize: 10, padding: "4px 8px", borderRadius: 4, background: "rgba(0,230,150,.12)", color: "var(--green)", border: "1px solid rgba(0,230,150,.3)", textDecoration: "none", whiteSpace: "nowrap" }}>
                          ⇄ {t("intel.trade_sodex")}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span className="mono" style={{ fontSize: 20, color: "var(--text)" }}>{fmtPrice(ix.price)}</span>
                      <span className="mono" style={{ fontSize: 12, color: pctColor(ix.change24h) }}>{fmtPct(ix.change24h)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, borderTop: "1px solid var(--border)", paddingTop: 8 }} className="mono">
                      <span style={{ color: "var(--text-faint)" }}>7g <span style={{ color: pctColor(ix.roi7d) }}>{fmtPct(ix.roi7d)}</span></span>
                      <span style={{ color: "var(--text-faint)" }}>1a <span style={{ color: pctColor(ix.roi1m) }}>{fmtPct(ix.roi1m)}</span></span>
                      <span style={{ color: "var(--text-faint)" }}>3a <span style={{ color: pctColor(ix.roi3m) }}>{fmtPct(ix.roi3m)}</span></span>
                      <span style={{ color: "var(--text-faint)" }}>YTD <span style={{ color: pctColor(ix.ytd) }}>{fmtPct(ix.ytd)}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===== MAKRO TAKVİM ===== */}
      {!loading && (
        <section>
          <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--accent)", marginBottom: 12 }}>📅 {t("intel.macro_title").toUpperCase()}</div>

          {nextDay && (
            <div className="panel" style={{ padding: "14px 18px", marginBottom: 14, borderLeft: "3px solid var(--accent)" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 6 }}>{t("intel.next_event").toUpperCase()} · {nextDay.date}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {nextDay.events.map((e, i) => (
                  <span key={i} className="mono" style={{ fontSize: 12, padding: "3px 10px", borderRadius: 4, background: "rgba(0,230,150,.1)", color: "var(--accent)", border: "1px solid rgba(0,230,150,.25)" }}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {sortedMacro.length === 0 ? (
            <p className="mono" style={{ color: "var(--text-faint)", fontSize: 13 }}>{t("intel.no_macro")}</p>
          ) : (
            <div className="panel" style={{ overflow: "hidden" }}>
              {sortedMacro.slice(0, 30).map((m, i) => {
                const isPast = m.ms < todayMs;
                return (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "11px 16px", borderTop: i === 0 ? "none" : "1px solid var(--border)", opacity: isPast ? 0.5 : 1 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 92, whiteSpace: "nowrap" }}>{m.date}</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {m.events.map((e, j) => (
                        <span key={j} className="mono" style={{ fontSize: 11, color: "var(--text)" }}>{e}{j < m.events.length - 1 ? " ·" : ""}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SSI detay modalı: fiyat grafiği + kurucu coinler */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="panel" style={{ maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 22, position: "relative" }}>
            <button onClick={() => setSelected(null)} className="mono" style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "var(--text-dim)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>

            <div className="mono" style={{ fontSize: 18, color: "var(--text)", fontWeight: 700 }}>{prettyName(selected.ticker)}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, marginBottom: 16, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 24, color: "var(--text)" }}>{fmtPrice(selected.price)}</span>
              <span className="mono" style={{ fontSize: 13, color: pctColor(selected.change24h) }}>{fmtPct(selected.change24h)}</span>
              {sodexLink(selected.ticker) && (
                <a href={sodexLink(selected.ticker)!} target="_blank" rel="noopener noreferrer" className="mono" style={{ marginLeft: "auto", fontSize: 11, padding: "5px 12px", borderRadius: 4, background: "rgba(0,230,150,.12)", color: "var(--green)", border: "1px solid rgba(0,230,150,.3)", textDecoration: "none" }}>⇄ {t("intel.trade_sodex")}</a>
              )}
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, marginBottom: 18 }} className="mono">
              <span style={{ color: "var(--text-faint)" }}>7g <span style={{ color: pctColor(selected.roi7d) }}>{fmtPct(selected.roi7d)}</span></span>
              <span style={{ color: "var(--text-faint)" }}>1a <span style={{ color: pctColor(selected.roi1m) }}>{fmtPct(selected.roi1m)}</span></span>
              <span style={{ color: "var(--text-faint)" }}>3a <span style={{ color: pctColor(selected.roi3m) }}>{fmtPct(selected.roi3m)}</span></span>
              <span style={{ color: "var(--text-faint)" }}>YTD <span style={{ color: pctColor(selected.ytd) }}>{fmtPct(selected.ytd)}</span></span>
            </div>

            {detailLoading && <p className="mono" style={{ color: "var(--text-dim)", fontSize: 13 }}>{t("intel.loading")}</p>}

            {detail && (
              <>
                {detail.klines.length >= 2 ? (() => {
                  const W = 510, H = 150;
                  const { line, up } = sparklinePath(detail.klines, W, H);
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 6 }}>{t("intel.chart_title")}</div>
                      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                        <path d={line} fill="none" stroke={up ? "var(--green)" : "var(--red)"} strokeWidth="1.5" />
                      </svg>
                    </div>
                  );
                })() : (
                  <p className="mono" style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 18 }}>{t("intel.no_chart")}</p>
                )}

                <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 10 }}>{t("intel.constituents_title")}</div>
                {detail.constituents.length === 0 ? (
                  <p className="mono" style={{ color: "var(--text-faint)", fontSize: 12 }}>{t("intel.no_constituents")}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {detail.constituents.map((c) => (
                      <div key={c.symbol} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--text)", minWidth: 76 }}>{c.symbol}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, c.weight * 100)}%`, height: "100%", background: "var(--accent)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", minWidth: 48, textAlign: "right" }}>{(c.weight * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
