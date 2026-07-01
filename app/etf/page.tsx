"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import ETFFlowChart from "@/components/ETFFlowChart";

interface Fund { ticker: string; institute: string; netAssets: number | null; dailyNetInflow: number | null; cumNetInflow: number | null; fee: number | null; premium: number | null; }
interface Summary { totalNetAssets: number | null; dailyNetInflow: number | null; cumNetInflow: number | null; totalTokenHoldings: number | null; dailyTotalValueTraded: number | null; marketCapPct: number | null; lastUpdate: string; }
interface Data { summary: Summary; funds: Fund[]; history: { date: string; net: number; cum: number }[]; }

const fmtUSD = (v: number | null) => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(0)}`;
};
const fmtCompact = (v: number | null) => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(2)}K`;
  return `${s}${a.toFixed(2)}`;
};
const flowColor = (v: number | null) => (v == null ? "var(--text-dim)" : v >= 0 ? "var(--green)" : "var(--red)");

// ETF akış eğilimi: yeterli geçmiş varsa 7 günlük momentum, yoksa günlük net akıştan eğilim.
const BIAS_WINDOW = 7;
function computeBias(
  history: { date: string; net: number; cum: number }[],
  summary?: { dailyNetInflow: number | null } | null
) {
  if (history && history.length >= 3) {
    const recent = history.slice(-BIAS_WINDOW);
    const wider = history.slice(-30);
    const sumNet = recent.reduce((a, d) => a + d.net, 0);
    const posDays = recent.filter((d) => d.net > 0).length;
    const avgAbs = wider.reduce((a, d) => a + Math.abs(d.net), 0) / (wider.length || 1) || 1;
    const ratio = sumNet / (avgAbs * recent.length);
    const h = Math.ceil(recent.length / 2);
    const early = recent.slice(0, recent.length - h);
    const late = recent.slice(recent.length - h);
    const eAvg = early.reduce((a, d) => a + d.net, 0) / (early.length || 1);
    const lAvg = late.reduce((a, d) => a + d.net, 0) / (late.length || 1);
    const sameDir = Math.sign(lAvg) === Math.sign(sumNet) && sumNet !== 0;
    const accel = sameDir && Math.abs(lAvg) > Math.abs(eAvg);
    const decel = sameDir && Math.abs(lAvg) < Math.abs(eAvg);
    const mag = Math.abs(ratio);
    let level: -2 | -1 | 0 | 1 | 2;
    if (mag < 0.2) level = 0;
    else if (sumNet > 0) level = mag >= 0.6 ? 2 : 1;
    else level = mag >= 0.6 ? -2 : -1;
    return { level, sumNet, posDays, days: recent.length, accel, decel };
  }
  // fallback: geçmiş seri yoksa günlük net akış yönü
  const daily = summary?.dailyNetInflow;
  if (daily == null || !isFinite(daily)) return null;
  const level: -1 | 0 | 1 = Math.abs(daily) < 1e6 ? 0 : daily > 0 ? 1 : -1;
  return { level, sumNet: daily, posDays: daily > 0 ? 1 : 0, days: 1, accel: false, decel: false };
}

const ASSETS: { k: string; label: string }[] = [
  { k: "btc", label: "BTC" }, { k: "eth", label: "ETH" }, { k: "sol", label: "SOL" },
];

// Akış RSI'ı: son N günün net akışlarını klasik RSI mantığıyla 0-100 osilatöre çevirir.
// Yüksek = aşırı giriş (ısınma), düşük = aşırı çıkış (soğuma) → mean reversion okuması.
function computeFlowRSI(history: { net: number }[], period = 14): number | null {
  if (!history || history.length < period) return null;
  const recent = history.slice(-period);
  let gain = 0, loss = 0;
  for (const d of recent) {
    if (d.net > 0) gain += d.net;
    else loss += Math.abs(d.net);
  }
  const avgGain = gain / period, avgLoss = loss / period;
  if (avgGain === 0 && avgLoss === 0) return null;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

// Ardışık aynı yönlü (giriş/çıkış) gün sayısı: son sıfır-olmayan günden geriye say.
function computeStreak(history: { net: number }[]) {
  if (!history || history.length === 0) return null;
  let i = history.length - 1;
  while (i >= 0 && history[i].net === 0) i--;
  if (i < 0) return null;
  const dir = history[i].net > 0 ? 1 : -1;
  let count = 0;
  for (let j = i; j >= 0; j--) {
    const s = history[j].net > 0 ? 1 : history[j].net < 0 ? -1 : 0;
    if (s === dir) count++; else break;
  }
  return { dir, count };
}

// Günlük net akış ısı haritası: son ~42 gün, yeşil=giriş / kırmızı=çıkış, ton=büyüklük.
function FlowHeatmap({ history }: { history: { date: string; net: number }[] }) {
  const days = history.slice(-42);
  const max = Math.max(...days.map((d) => Math.abs(d.net)), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(15px, 1fr))", gap: 3 }}>
      {days.map((d, i) => {
        const intensity = Math.min(Math.abs(d.net) / max, 1);
        const rgb = d.net >= 0 ? "0,230,150" : "255,70,70";
        const alpha = d.net === 0 ? 0.06 : 0.18 + intensity * 0.82;
        return (
          <div
            key={i}
            title={`${d.date}: ${d.net >= 0 ? "+" : ""}${fmtUSD(d.net)}`}
            style={{ aspectRatio: "1", borderRadius: 3, background: `rgba(${rgb},${alpha})`, border: "1px solid var(--border)" }}
          />
        );
      })}
    </div>
  );
}

export default function ETFPage() {
  const { t } = useT();
  const [asset, setAsset] = useState("btc");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/etf?asset=${asset}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; if (d.error && !d.summary) setError(d.error); else setData(d); })
      .catch(() => alive && setError("exception"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [asset]);

  const s = data?.summary;
  const tokenLabel = asset.replace("hk-", "").toUpperCase();
  const bias = data ? computeBias(data.history, data.summary) : null;
  const streak = data ? computeStreak(data.history) : null;
  const flowRSI = data ? computeFlowRSI(data.history) : null;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <h1 className="display" style={{ fontSize: 26 }}>{t("etf.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 4, marginBottom: 18 }}>{t("etf.subtitle")}</p>

      {/* asset şeridi */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {ASSETS.map((a) => {
          const on = asset === a.k;
          return (
            <button key={a.k} onClick={() => setAsset(a.k)} className="mono" style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: on ? 700 : 400,
              background: on ? "var(--green)" : "var(--bg-soft)", color: on ? "#04150d" : "var(--text-dim)",
              border: "1px solid " + (on ? "transparent" : "var(--border-glow)"),
            }}>{a.label}</button>
          );
        })}
      </div>

      {error === "no-key" && (
        <div className="panel" style={{ padding: 16, borderLeft: "3px solid var(--accent)", marginBottom: 16, fontSize: 13, color: "var(--text-dim)" }}>
          SoSoValue API anahtarı ayarlı değil. Vercel'de <span className="mono" style={{ color: "var(--accent)" }}>SOSOVALUE_API_KEY</span> environment variable'ını ekleyin.
        </div>
      )}
      {error && error !== "no-key" && <div className="panel" style={{ padding: 16, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{t("etf.error")}</div>}
      {loading && !data && <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>{t("etf.loading")}</div>}

      {data && (
        <>
          {/* ETF akış eğilimi (momentum okuması — anlık sinyal değil) */}
          {bias && (() => {
            const map = {
              2: { label: "etf.bias_strong_buy", color: "var(--green)", emoji: "🟢" },
              1: { label: "etf.bias_buy", color: "var(--green)", emoji: "🟢" },
              0: { label: "etf.bias_neutral", color: "var(--text-dim)", emoji: "⚪" },
              [-1]: { label: "etf.bias_sell", color: "var(--red)", emoji: "🔴" },
              [-2]: { label: "etf.bias_strong_sell", color: "var(--red)", emoji: "🔴" },
            } as const;
            const m = map[bias.level];
            const mom = bias.accel ? t("etf.bias_accel") : bias.decel ? t("etf.bias_decel") : "";
            return (
              <div className="panel" style={{ padding: "16px 18px", marginBottom: 18, borderLeft: `4px solid ${m.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 1 }}>{t("etf.bias_title").toUpperCase()} · {tokenLabel}</span>
                  {streak && streak.count >= 2 && (
                    <span className="mono" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
                      background: streak.dir > 0 ? "rgba(0,230,150,.12)" : "rgba(255,70,70,.12)",
                      color: streak.dir > 0 ? "var(--green)" : "var(--red)",
                      border: `1px solid ${streak.dir > 0 ? "rgba(0,230,150,.3)" : "rgba(255,70,70,.3)"}` }}>
                      {streak.dir > 0 ? "🔥" : "❄️"} {streak.count} {t(streak.dir > 0 ? "etf.streak_in" : "etf.streak_out")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                  <span className="display" style={{ fontSize: 22, color: m.color }}>{m.emoji} {t(m.label)}</span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    {bias.days}d · <span style={{ color: flowColor(bias.sumNet) }}>{bias.sumNet >= 0 ? "+" : ""}{fmtUSD(bias.sumNet)}</span>{bias.days > 1 ? ` · ${bias.posDays}/${bias.days} ↑` : ""}{mom ? ` · ${mom}` : ""}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
                  ⓘ {t("etf.bias_note").replace("{n}", String(bias.days))}
                </div>
              </div>
            );
          })()}

          {/* özet kartları */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
            <Stat label={t("etf.total_assets")} value={fmtUSD(s!.totalNetAssets)} />
            <Stat label={t("etf.daily_flow")} value={fmtUSD(s!.dailyNetInflow)} color={flowColor(s!.dailyNetInflow)} />
            <Stat label={t("etf.cum_flow")} value={fmtUSD(s!.cumNetInflow)} color={flowColor(s!.cumNetInflow)} />
            <Stat label={`${t("etf.holdings")} (${tokenLabel})`} value={fmtCompact(s!.totalTokenHoldings)} />
            <Stat label={t("etf.volume")} value={fmtUSD(s!.dailyTotalValueTraded)} />
            <Stat label={`${t("etf.market_cap_pct")} (${tokenLabel})`} value={s!.marketCapPct != null ? `${(s!.marketCapPct * 100).toFixed(2)}%` : "—"} color="var(--accent)" />
          </div>

          {/* akış grafiği */}
          {data.history.length > 0 && (
            <div className="panel" style={{ padding: 14, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11 }} className="mono">
                <span style={{ color: "#22d3ee" }}>━ {t("etf.cum_flow")}</span>
                <span style={{ color: "var(--green)" }}>▮ {t("etf.daily_flow")} (+)</span>
                <span style={{ color: "var(--red)" }}>▮ {t("etf.daily_flow")} (−)</span>
              </div>
              <ETFFlowChart history={data.history} />
            </div>
          )}

          {/* günlük net akış ısı haritası */}
          {data.history.length > 0 && (
            <div className="panel" style={{ padding: 14, marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 10 }}>
                {t("etf.heatmap_title").toUpperCase()} · {tokenLabel} · {t("etf.heatmap_days")}
              </div>
              <FlowHeatmap history={data.history} />
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 10 }} className="mono">
                <span style={{ color: "var(--green)" }}>▮ {t("etf.daily_flow")} (+)</span>
                <span style={{ color: "var(--red)" }}>▮ {t("etf.daily_flow")} (−)</span>
              </div>
            </div>
          )}

          {/* akış momentum osilatörü (akış RSI'ı — mean reversion okuması) */}
          {flowRSI != null && (() => {
            const hot = flowRSI >= 70, cold = flowRSI <= 30;
            const col = hot ? "var(--amber)" : cold ? "#22d3ee" : "var(--text-dim)";
            const lbl = hot ? "etf.rsi_hot" : cold ? "etf.rsi_cold" : "etf.rsi_neutral";
            const emoji = hot ? "🔥" : cold ? "❄️" : "•";
            return (
              <div className="panel" style={{ padding: "14px 18px", marginBottom: 18 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 8 }}>
                  {t("etf.rsi_title").toUpperCase()} · {tokenLabel} · RSI(14)
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: col }}>{emoji} {flowRSI}</span>
                  <span className="mono" style={{ fontSize: 13, color: col }}>{t(lbl)}</span>
                </div>
                <div style={{ position: "relative", height: 8, borderRadius: 4, marginTop: 12, background: "linear-gradient(90deg, rgba(34,211,238,.45) 0%, rgba(34,211,238,.12) 28%, rgba(107,125,147,.12) 50%, rgba(255,184,0,.12) 72%, rgba(255,184,0,.45) 100%)" }}>
                  <div style={{ position: "absolute", left: `${Math.max(0, Math.min(100, flowRSI))}%`, top: -3, width: 3, height: 14, background: "var(--text)", borderRadius: 2, transform: "translateX(-50%)" }} />
                </div>
                <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-faint)", marginTop: 5 }}>
                  <span>0 · {t("etf.rsi_cold")}</span><span>50</span><span>{t("etf.rsi_hot")} · 100</span>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
                  ⓘ {t("etf.rsi_note")}
                </div>
              </div>
            );
          })()}

          {/* fon tablosu */}
          {data.funds.length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }} className="display">{t("etf.funds")}</div>
              <div style={{ overflowX: "auto" }}>
                <table className="mono" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 640 }}>
                  <thead>
                    <tr style={{ color: "var(--text-faint)", textAlign: "right" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Ticker</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Institute</th>
                      <th style={{ padding: "8px 12px" }}>{t("etf.total_assets")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("etf.daily_flow")}</th>
                      <th style={{ padding: "8px 12px" }}>{t("etf.cum_flow")}</th>
                      <th style={{ padding: "8px 12px" }}>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.funds.map((f) => (
                      <tr key={f.ticker} style={{ borderTop: "1px solid var(--border)", textAlign: "right" }}>
                        <td style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text)" }}>{f.ticker}</td>
                        <td style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-dim)" }}>{f.institute}</td>
                        <td style={{ padding: "8px 12px" }}>{fmtUSD(f.netAssets)}</td>
                        <td style={{ padding: "8px 12px", color: flowColor(f.dailyNetInflow) }}>{fmtUSD(f.dailyNetInflow)}</td>
                        <td style={{ padding: "8px 12px", color: flowColor(f.cumNetInflow) }}>{fmtUSD(f.cumNetInflow)}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>{f.fee == null ? "—" : `${(f.fee * 100).toFixed(2)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {s?.lastUpdate && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 10, textAlign: "right" }}>Last update: {s.lastUpdate}</div>}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="panel" style={{ padding: "12px 14px" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}
