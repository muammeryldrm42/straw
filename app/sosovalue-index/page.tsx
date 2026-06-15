"use client";
import { useEffect, useState, Fragment, type CSSProperties } from "react";
import { useT } from "@/lib/i18n";

interface Idx {
  ticker: string; name: string;
  price: number | null; change24h: number | null;
  roi7d: number | null; roi1m: number | null; roi3m: number | null; roi1y: number | null; ytd: number | null;
}
interface Detail { constituents: { symbol: string; weight: number }[]; klines: { t: number; c: number }[]; loading: boolean; }
type SortKey = "price" | "change24h" | "roi7d" | "roi1m" | "roi3m" | "roi1y" | "ytd";

const pct = (v: number | null) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`);
const col = (v: number | null) => (v == null ? "var(--text-faint)" : v >= 0 ? "var(--green)" : "var(--red)");
const usd = (v: number | null) => (v == null ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const thS: CSSProperties = { padding: "12px 14px", fontSize: 11, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", letterSpacing: 0.3, userSelect: "none" };
const tdS: CSSProperties = { padding: "12px 14px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap" };

// Hafif inline SVG alan grafiği (lightweight-charts kutusu yerine). Kart hissi vermez.
function AreaChart({ data }: { data: { t: number; c: number }[] }) {
  const { t } = useT();
  if (!data || data.length < 2) return <div className="mono" style={{ color: "var(--text-faint)", fontSize: 12 }}>{t("ssidx.no_chart")}</div>;
  const w = 440, h = 130, pad = 5;
  const cs = data.map((d) => d.c);
  const min = Math.min(...cs), max = Math.max(...cs), rng = max - min || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (d.c - min) / rng) * (h - 2 * pad);
    return [x, y] as [number, number];
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  const up = cs[cs.length - 1] >= cs[0];
  const color = up ? "var(--green)" : "var(--red)";
  const chg = ((cs[cs.length - 1] - cs[0]) / (cs[0] || 1)) * 100;
  return (
    <div>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>
        <span>{t("ssidx.chart")}</span>
        <span style={{ color }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
        <path d={area} fill={color} opacity={0.12} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export default function SsiIndexPage() {
  const { t } = useT();
  const [data, setData] = useState<Idx[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("roi1y");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});

  useEffect(() => {
    fetch("/api/sosovalue-index")
      .then((r) => r.json())
      .then((d) => { if (d.indices && d.indices.length) setData(d.indices); else setErr(true); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (ticker: string) => {
    if (open === ticker) { setOpen(null); return; }
    setOpen(ticker);
    if (!details[ticker]) {
      setDetails((p) => ({ ...p, [ticker]: { constituents: [], klines: [], loading: true } }));
      fetch(`/api/sosovalue-index/${encodeURIComponent(ticker)}`)
        .then((r) => r.json())
        .then((d) => setDetails((p) => ({ ...p, [ticker]: { constituents: d.constituents || [], klines: d.klines || [], loading: false } })))
        .catch(() => setDetails((p) => ({ ...p, [ticker]: { constituents: [], klines: [], loading: false } })));
    }
  };

  const sorted = data
    ? [...data].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        return asc ? av - bv : bv - av;
      })
    : [];

  const setSort = (k: SortKey) => { if (k === sortKey) setAsc(!asc); else { setSortKey(k); setAsc(false); } };

  const cols: { key: SortKey; label: string }[] = [
    { key: "price", label: t("ssidx.price") },
    { key: "change24h", label: t("ssidx.chg24") },
    { key: "roi7d", label: t("ssidx.roi7d") },
    { key: "roi1m", label: t("ssidx.roi1m") },
    { key: "roi3m", label: t("ssidx.roi3m") },
    { key: "roi1y", label: t("ssidx.roi1y") },
    { key: "ytd", label: t("ssidx.ytd") },
  ];

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>{t("ssidx.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 0, marginBottom: 22 }}>{t("ssidx.subtitle")}</p>

      {loading && <div className="mono" style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>{t("ssidx.loading")}</div>}
      {err && !loading && <div className="mono" style={{ padding: 24, textAlign: "center", color: "var(--red)" }}>{t("ssidx.error")}</div>}

      {sorted.length > 0 && (
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
                <th style={{ ...thS, textAlign: "center", color: "var(--text-faint)" }}>#</th>
                <th style={{ ...thS, textAlign: "left", color: "var(--text-faint)" }}>{t("ssidx.index")}</th>
                {cols.map((c) => (
                  <th key={c.key} style={{ ...thS, cursor: "pointer", color: sortKey === c.key ? "var(--accent)" : "var(--text-faint)" }} onClick={() => setSort(c.key)}>
                    {c.label}{sortKey === c.key ? (asc ? " ↑" : " ↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const isOpen = open === r.ticker;
                const det = details[r.ticker];
                return (
                  <Fragment key={r.ticker}>
                    <tr
                      onClick={() => toggle(r.ticker)}
                      style={{ borderBottom: isOpen ? "none" : "1px solid var(--border)", cursor: "pointer", background: isOpen ? "var(--bg-soft)" : "transparent" }}
                    >
                      <td style={{ ...tdS, textAlign: "center", color: "var(--text-faint)" }}>{i + 1}</td>
                      <td style={{ ...tdS, textAlign: "left", fontWeight: 700, color: "var(--text)" }}>
                        <span style={{ color: "var(--accent)", marginRight: 7, fontSize: 11 }}>{isOpen ? "▾" : "▸"}</span>{r.name}
                      </td>
                      <td style={{ ...tdS, fontWeight: 700, color: "var(--text)" }}>{usd(r.price)}</td>
                      <td style={tdS}><span style={{ color: col(r.change24h), fontWeight: 600 }}>{pct(r.change24h)}</span></td>
                      <td style={{ ...tdS, color: col(r.roi7d) }}>{pct(r.roi7d)}</td>
                      <td style={{ ...tdS, color: col(r.roi1m) }}>{pct(r.roi1m)}</td>
                      <td style={{ ...tdS, color: col(r.roi3m) }}>{pct(r.roi3m)}</td>
                      <td style={{ ...tdS, color: col(r.roi1y) }}>{pct(r.roi1y)}</td>
                      <td style={{ ...tdS, color: col(r.ytd) }}>{pct(r.ytd)}</td>
                    </tr>
                    {isOpen && (
                      <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          {det?.loading ? (
                            <div className="mono" style={{ padding: "20px 22px", color: "var(--text-faint)", fontSize: 12 }}>{t("ssidx.detail_loading")}</div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 28, padding: "20px 22px 24px" }}>
                              <div>
                                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 12 }}>{t("ssidx.constituents")}</div>
                                {det && det.constituents.length > 0 ? det.constituents.map((c) => (
                                  <div key={c.symbol} className="mono" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                    <span style={{ width: 64, fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{c.symbol}</span>
                                    <div style={{ flex: 1, height: 7, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                                      <div style={{ width: `${Math.min(100, c.weight * 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
                                    </div>
                                    <span style={{ width: 52, textAlign: "right", fontSize: 12, color: "var(--text-dim)" }}>{(c.weight * 100).toFixed(1)}%</span>
                                  </div>
                                )) : <div className="mono" style={{ color: "var(--text-faint)", fontSize: 12 }}>{t("ssidx.no_constituents")}</div>}
                              </div>
                              <div style={{ alignSelf: "start" }}>
                                <AreaChart data={det?.klines || []} />
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
