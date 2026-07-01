"use client";
import { useState, useEffect, type CSSProperties } from "react";
import { useT } from "@/lib/i18n";

interface Row {
  id: string; name: string;
  totalReturn: number; sharpe: number; maxDrawdown: number; winRate: number; exposureDays: number; vsHold?: number;
}
interface SkillResult {
  source: "cmc" | "mock"; days: number;
  hold: { totalReturn: number; sharpe: number; maxDrawdown: number };
  skills: Row[]; note: string;
}
interface StratResult {
  source: "cmc" | "mock"; days: number;
  categories: { category: string; count: number; strategies: Row[] }[];
}

const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const col = (v: number) => (v >= 0 ? "var(--green)" : "var(--red)");
const thS: CSSProperties = { padding: "10px 12px", fontSize: 11, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", color: "var(--text-faint)", letterSpacing: 0.3 };
const tdS: CSSProperties = { padding: "9px 12px", fontSize: 12.5, textAlign: "right", whiteSpace: "nowrap" };

const CAT_NAMES: Record<string, string> = {
  popular: "Popular", reversal: "Reversal", priceaction: "Price Action", momentum: "Momentum",
  indicators: "Indicators", hybrid: "Hybrid", classics: "Classics", bands: "Bands",
  advancedsmc: "Advanced SMC", trendstrength: "Trend Strength", statistical: "Statistical",
  smc: "SMC", ichimoku: "Ichimoku", fibonacci: "Fibonacci", divergence: "Divergence",
  botstrat: "Bot Strategies", wyckoff: "Wyckoff", vwap: "VWAP", volume: "Volume", pivots: "Pivots",
  oscillators: "Oscillators", movingavg: "Moving Averages", chartpatterns: "Chart Patterns",
  volatility: "Volatility", harmonic: "Harmonic", trend: "Trend", patterns: "Patterns",
  breakout: "Breakout", scalping: "Scalping", meanrev: "Mean Reversion",
};

function Table({ rows, t, showVs }: { rows: Row[]; t: (k: string) => string; showVs?: boolean }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
      <table className="mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: showVs ? 760 : 680 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
            <th style={{ ...thS, textAlign: "left" }}>{t("bt.col_name2")}</th>
            <th style={thS}>{t("bt.col_return")}</th>
            {showVs && <th style={thS}>{t("bt.col_vs")}</th>}
            <th style={thS}>{t("bt.col_sharpe")}</th>
            <th style={thS}>{t("bt.col_dd")}</th>
            <th style={thS}>{t("bt.col_win")}</th>
            <th style={thS}>{t("bt.col_exp")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const noSig = s.exposureDays === 0;
            return (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...tdS, textAlign: "left", color: noSig ? "var(--text-faint)" : "var(--text)" }}>{s.name}</td>
                {noSig ? (
                  <td colSpan={showVs ? 6 : 5} style={{ ...tdS, textAlign: "left", color: "var(--text-faint)", fontStyle: "italic" }}>{t("bt.no_signal")}</td>
                ) : (
                  <>
                    <td style={{ ...tdS, fontWeight: 700, color: col(s.totalReturn) }}>{pct(s.totalReturn)}</td>
                    {showVs && <td style={{ ...tdS, color: (s.vsHold ?? 0) > 0 ? "var(--green)" : "var(--text-faint)" }}>{(s.vsHold ?? 0) > 0 ? "beat" : "-"}</td>}
                    <td style={{ ...tdS, color: s.sharpe >= 0 ? "var(--green)" : "var(--red)" }}>{s.sharpe.toFixed(2)}</td>
                    <td style={{ ...tdS, color: "var(--red)" }}>{(s.maxDrawdown * 100).toFixed(0)}%</td>
                    <td style={{ ...tdS, color: "var(--text-dim)" }}>{(s.winRate * 100).toFixed(0)}%</td>
                    <td style={{ ...tdS, color: "var(--text-faint)" }}>{s.exposureDays}d</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BacktestPage() {
  const { t } = useT();
  const [tab, setTab] = useState<"skills" | "strategies">("skills");

  // skills (live)
  const [skPhase, setSkPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [skill, setSkill] = useState<SkillResult | null>(null);
  async function runSkills() {
    setSkPhase("loading");
    try {
      const r = await fetch("/api/skill-backtest?days=1460", { cache: "no-store" });
      const j = (await r.json()) as SkillResult;
      if (!j.skills) throw new Error();
      setSkill(j); setSkPhase("done");
    } catch { setSkPhase("error"); }
  }

  // strategies (live)
  const [stPhase, setStPhase] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [strat, setStrat] = useState<StratResult | null>(null);
  async function runStrats() {
    setStPhase("loading");
    try {
      const r = await fetch("/api/strategy-backtest?days=1460", { cache: "no-store" });
      const j = (await r.json()) as StratResult;
      if (!j.categories) throw new Error();
      setStrat(j); setStPhase("done");
    } catch { setStPhase("error"); }
  }

  useEffect(() => {
    if (tab === "skills" && skPhase === "idle") runSkills();
    if (tab === "strategies" && stPhase === "idle") runStrats();
    /* eslint-disable-next-line */
  }, [tab]);

  const tabBtn = (m: "skills" | "strategies"): CSSProperties => ({
    padding: "11px 22px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: 0.4,
    border: `2px solid ${tab === m ? "var(--accent)" : "var(--border)"}`,
    background: tab === m ? "var(--accent)" : "transparent",
    color: tab === m ? "#fff" : "var(--text-dim)",
  });

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>{t("bt.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 0, marginBottom: 18 }}>{t("bt.subtitle")}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <button onClick={() => setTab("skills")} style={tabBtn("skills")}>{t("bt.tab_skills")}</button>
        <button onClick={() => setTab("strategies")} style={tabBtn("strategies")}>{t("bt.tab_strats")}</button>
      </div>

      {/* ===== SKILLS ===== */}
      {tab === "skills" && (
        <>
          {skPhase === "loading" && <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("bt.loading")}</div>}
          {skPhase === "error" && <div className="mono" style={{ padding: 16, border: "1px solid var(--red)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>{t("bt.error")} <button onClick={runSkills} style={{ marginLeft: 10, color: "var(--text-dim)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>{t("bt.retry")}</button></div>}
          {skPhase === "done" && skill && (
            <>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 16 }}>
                BTC {skill.days}d · {skill.source === "cmc" ? t("bt.src_real") : t("bt.src_synth")} · {t("bt.mode_long")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", padding: "16px 20px", border: "1px solid var(--accent)", borderRadius: 10, marginBottom: 26, background: "var(--bg-soft)" }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: 0.4 }}>{t("bt.bench_skills")}</div>
                  <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: col(skill.hold.totalReturn) }}>{pct(skill.hold.totalReturn)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 260, fontSize: 12.5, color: "#fff", lineHeight: 1.6 }}>
                  {t("bt.bench_detail")}
                  <div style={{ marginTop: 6, color: "var(--text)", fontWeight: 600 }}>{skill.skills.filter((s) => (s.vsHold ?? 0) > 0).length} / {skill.skills.length}<span style={{ color: "var(--text-dim)", fontWeight: 400 }}> · beat buy &amp; hold</span></div>
                </div>
              </div>
              <Table rows={skill.skills} t={t} showVs />
              <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 14, lineHeight: 1.6 }}>{skill.note}</p>
            </>
          )}
        </>
      )}

      {/* ===== STRATEGIES (long+short, no buy&hold) ===== */}
      {tab === "strategies" && (
        <>
          {stPhase === "loading" && <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("bt.loading_strats")}</div>}
          {stPhase === "error" && <div className="mono" style={{ padding: 16, border: "1px solid var(--red)", borderRadius: 8, color: "var(--red)", fontSize: 13 }}>{t("bt.error")} <button onClick={runStrats} style={{ marginLeft: 10, color: "var(--text-dim)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>{t("bt.retry")}</button></div>}
          {stPhase === "done" && strat && (
            <>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 12 }}>
                BTC {strat.days}d · {strat.categories.reduce((a, c) => a + c.count, 0)} {t("bt.strats_word")} · {strat.categories.length} {t("bt.cats_word")} · {strat.source === "cmc" ? t("bt.src_real") : t("bt.src_synth")} · {t("bt.mode_ls")}
              </div>
              <p style={{ color: "#fff", fontSize: 12.5, marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>{t("bt.strats_intro")}</p>
              {strat.categories.map((c) => (
                <div key={c.category} style={{ marginBottom: 30 }}>
                  <h3 style={{ fontSize: 16, margin: "0 0 10px", display: "flex", alignItems: "baseline", gap: 10 }}>
                    {CAT_NAMES[c.category] || c.category}
                    <span style={{ color: "var(--text-faint)", fontSize: 12, fontWeight: 400 }}>· {c.count} {t("bt.strats_word")}</span>
                  </h3>
                  <Table rows={c.strategies} t={t} />
                </div>
              ))}
              <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>{t("bt.strats_note")}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
