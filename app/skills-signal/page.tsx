"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

interface Verdict { symbol: string; signal: "BUY" | "SELL" | "NEUTRAL"; reason: string; }
interface SkillOut { id: string; name: string; summary: string; entry: string; exit: string; inputs: string[]; verdicts: Verdict[]; }
interface Decision {
  market: {
    regime: string; regimeLabel: string; regimeConfidence: number; regimeReasons: string[];
    fearGreed: number; altseasonIndex: number; btcDominance: number;
    signals: { btcReturn7d: number; btcReturn30d: number; btcDominanceTrend: number };
    playbook: { riskBudget: number; universe: string; directionBias: string; weights: { signal: string; weight: number; emphasis: string }[] };
  };
  totalTargetExposure: number;
}
interface Breadth { universe: number; advancers24h: number; decliners24h: number; advancers7d: number; decliners7d: number; avgChange24h: number; }
interface Payload { decision: Decision; skills: SkillOut[]; breadth: Breadth; scanned: number; }

const regimeColor = (r: string) => (r.includes("RISK_ON") ? "var(--green)" : r === "CHOP" ? "#f5a623" : "var(--red)");
const sigColor = (s: string) => (s === "BUY" ? "var(--green)" : s === "SELL" ? "var(--red)" : "#f5a623");
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", background: "var(--bg)" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return <span className="mono" style={{ fontSize: 10, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 5, padding: "2px 7px", letterSpacing: 0.5 }}>{text}</span>;
}

export default function SkillsSignalPage() {
  const { t } = useT();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/skills-signal")
      .then((r) => r.json())
      .then((d) => { if (d.decision) setData(d); else setErr(true); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const m = data?.decision.market;
  const pb = m?.playbook;
  const b = data?.breadth;
  const sig = m?.signals;
  const fgLabel = (v: number) => (v >= 75 ? "Extreme Greed" : v >= 55 ? "Greed" : v >= 45 ? "Neutral" : v >= 25 ? "Fear" : "Extreme Fear");

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>{t("skills.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 0, marginBottom: 6 }}>{t("skills.subtitle")}</p>
      <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 0, marginBottom: 22 }}>{t("skills.disclaimer")}</p>

      {loading && <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }} className="mono">{t("skills.loading")}</div>}
      {err && !loading && <div style={{ padding: 24, textAlign: "center", color: "var(--red)" }} className="mono">{t("skills.error")}</div>}

      {m && pb && sig && (
        <>
          <div style={{ border: `1px solid ${regimeColor(m.regime)}`, borderRadius: 12, padding: "22px 24px", marginBottom: 22, background: "var(--bg-soft)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 10 }}>{t("skills.todays_call")}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: regimeColor(m.regime) }}>{m.regimeLabel}</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>{Math.round(m.regimeConfidence * 100)}% {t("skills.confidence")}</span>
            </div>
            <p style={{ margin: "12px 0 18px", color: "var(--text)", lineHeight: 1.6, fontSize: 15 }}>{pb.directionBias}</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              <Metric label={t("skills.m_fg")} value={`${m.fearGreed} · ${fgLabel(m.fearGreed)}`} color={m.fearGreed >= 55 ? "var(--green)" : m.fearGreed <= 45 ? "var(--red)" : "#f5a623"} />
              <Metric label={t("skills.m_alt")} value={`${m.altseasonIndex}/100`} color={m.altseasonIndex >= 50 ? "var(--green)" : "var(--text-dim)"} />
              <Metric label={t("skills.m_dom")} value={`${m.btcDominance.toFixed(1)}%`} color="var(--text)" />
              <Metric label={t("skills.m_btc7")} value={fmtPct(sig.btcReturn7d)} color={sig.btcReturn7d >= 0 ? "var(--green)" : "var(--red)"} />
              <Metric label={t("skills.m_btc30")} value={fmtPct(sig.btcReturn30d)} color={sig.btcReturn30d >= 0 ? "var(--green)" : "var(--red)"} />
              {b && <Metric label={t("skills.m_breadth")} value={`${b.advancers24h}\u2191 / ${b.decliners24h}\u2193`} color={b.advancers24h >= b.decliners24h ? "var(--green)" : "var(--red)"} />}
            </div>
          </div>

          <details style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 24, background: "var(--bg-soft)" }}>
            <summary className="mono" style={{ cursor: "pointer", color: "var(--accent)", fontSize: 12, letterSpacing: 1 }}>{t("skills.how_title")}</summary>
            <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
              <p style={{ marginTop: 0 }}>{t("skills.how_intro")}</p>
              <p><b style={{ color: "var(--text)" }}>1. {t("skills.how_l1_t")}</b> {t("skills.how_l1_b")}</p>
              <p><b style={{ color: "var(--text)" }}>2. {t("skills.how_l2_t")}</b> {t("skills.how_l2_b")}</p>
              <p style={{ marginBottom: 0 }}><b style={{ color: "var(--text)" }}>3. {t("skills.how_l3_t")}</b> {t("skills.how_l3_b")}</p>
            </div>
          </details>

          {/* 24 skill — BTC & ETH */}
          <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
            {t("skills.library")} · {data!.skills.length} {t("skills.skills_word")} · BTC &amp; ETH
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {data!.skills.map((s) => (
              <div key={s.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "18px 20px", background: "var(--bg-soft)" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: 1, marginBottom: 8 }}>{s.name.toUpperCase()}</div>
                <p style={{ margin: "0 0 14px", color: "var(--text)", fontWeight: 600, lineHeight: 1.5 }}>{s.summary}</p>
                <div className="mono" style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", gap: 10, marginBottom: 6 }}>
                  <Tag text="ENTRY" color="var(--green)" /><span style={{ lineHeight: 1.5 }}>{s.entry}</span>
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", gap: 10, marginBottom: 14 }}>
                  <Tag text="EXIT" color="var(--green)" /><span style={{ lineHeight: 1.5 }}>{s.exit}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.verdicts.map((v) => (
                    <div key={v.symbol} className="mono" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)" }}>
                      <a
                        href={v.symbol === "BTC" ? "https://sosovalue.com/coins/bitcoin" : v.symbol === "ETH" ? "https://sosovalue.com/coins/ethereum" : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, fontSize: 13, minWidth: 38, color: "var(--accent)", textDecoration: "none" }}
                        title={`${v.symbol} on SoSoValue`}
                      >{v.symbol} ↗</a>
                      <Tag text={v.signal} color={sigColor(v.signal)} />
                      <span style={{ color: "var(--text-dim)", fontSize: 12, lineHeight: 1.5 }}>{v.reason}</span>
                    </div>
                  ))}
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14 }}>{t("skills.inputs")}: {s.inputs.join(" · ")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
