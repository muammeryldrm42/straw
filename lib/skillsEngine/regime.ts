// Talons Regime Engine — Layer A: regime classifier (SKILL.md §4).
// Two axes: risk appetite (F&G + BTC trend) and leadership (dominance trend + altseason).

import type { MarketSignals, RegimeResult, RegimeName } from "./types";
import { REGIME_CONFIG } from "./weights";
import { REGIME_THRESHOLDS as T, DERIVATIVES } from "./config";

export function classifyRegime(s: MarketSignals): RegimeResult {
  const reasons: string[] = [];
  const fg = s.fearGreed;
  const alt = s.altseasonIndex;
  const dom = s.btcDominanceTrend;
  const btc7 = s.btcReturn7d;

  let regime: RegimeName;

  // Priority order: extreme states first, then risk-on (split by leadership), else chop.
  if (fg < T.fgExtremeLow && btc7 < T.btcSharpDown) {
    regime = "CAPITULATION";
    reasons.push(`Extreme fear (F&G ${fg})`, `BTC down ${btc7.toFixed(1)}% (7d)`);
  } else if (fg < T.fgLow && btc7 < T.btcTrendUp) {
    regime = "RISK_OFF";
    reasons.push(`Fear (F&G ${fg})`, dom >= 0 ? "Dominance rising — flight to BTC" : "Weak tape");
  } else if (fg > T.fgMidHigh && btc7 > T.btcTrendUp) {
    // risk-on — split by leadership
    if (alt > T.altSeasonHi || dom <= T.domTrendDown) {
      regime = "ALT_SEASON_RISK_ON";
      reasons.push(`Greed (F&G ${fg})`, `Alts leading (altseason ${alt}${dom <= T.domTrendDown ? ", dominance falling" : ""})`);
    } else {
      regime = "BTC_LED_RISK_ON";
      reasons.push(`Greed (F&G ${fg})`, "BTC leading, alts lagging");
    }
  } else {
    regime = "CHOP";
    reasons.push(`Neutral sentiment (F&G ${fg})`, "No clear leadership trend");
  }

  // Derivatives positioning can switch or adjust the regime (Track 2 example #3).
  const adj = applyDerivatives(regime, s, reasons);
  regime = adj.regime;

  return {
    regime,
    confidence: round2(adj.confidenceScale * regimeConfidence(s, regime)),
    riskBudget: REGIME_CONFIG[regime].riskBudget,
    label: REGIME_CONFIG[regime].label,
    reasons,
  };
}

// Funding / open-interest positioning: crowded longs cool risk-on; a leverage
// washout (deeply negative funding + falling OI in a downtrend) escalates to
// capitulation. Degrades to a no-op when derivatives data is absent (backtest).
function applyDerivatives(
  regime: RegimeName,
  s: MarketSignals,
  reasons: string[],
): { regime: RegimeName; confidenceScale: number } {
  const f = s.aggFundingRate;
  const oi = s.openInterestChange;
  let confidenceScale = 1;

  if (typeof f === "number") {
    const riskOn = regime === "ALT_SEASON_RISK_ON" || regime === "BTC_LED_RISK_ON";
    if (riskOn && f > DERIVATIVES.fundingHot) {
      reasons.push("Derivatives: crowded longs (funding hot) — late-cycle caution");
      confidenceScale = 0.8;
    }
    if ((regime === "RISK_OFF" || regime === "CHOP") && f < DERIVATIVES.fundingWashout && s.btcReturn7d < -5) {
      reasons.push("Derivatives: leverage washout (funding deeply negative) — escalating to capitulation");
      regime = "CAPITULATION";
    } else if (regime === "RISK_OFF" && f < DERIVATIVES.fundingShortCrowd) {
      reasons.push("Derivatives: shorts crowded (negative funding) — contrarian fuel");
      confidenceScale = 1.1;
    }
  }
  if (typeof oi === "number" && regime === "CAPITULATION" && oi < DERIVATIVES.oiCollapse) {
    reasons.push("Derivatives: open interest collapsing — forced deleveraging");
    confidenceScale = Math.min(confidenceScale * 1.15, 1.3);
  }
  return { regime, confidenceScale };
}

// Confidence = how cleanly the inputs agree with the chosen regime.
// Cheap heuristic: distance of key inputs from their regime boundaries, clamped.
function regimeConfidence(s: MarketSignals, regime: RegimeName): number {
  const fg = s.fearGreed;
  const btc7 = s.btcReturn7d;
  let c = 0.5;
  switch (regime) {
    case "CAPITULATION":
      c = clamp01(0.5 + (T.fgExtremeLow - fg) / 40 + (T.btcSharpDown - btc7) / 30);
      break;
    case "RISK_OFF":
      c = clamp01(0.5 + (T.fgLow - fg) / 40 + s.btcDominanceTrend / 4);
      break;
    case "ALT_SEASON_RISK_ON":
      c = clamp01(0.4 + (fg - T.fgHigh) / 40 + (s.altseasonIndex - T.altSeasonHi) / 25);
      break;
    case "BTC_LED_RISK_ON":
      c = clamp01(0.4 + (fg - T.fgMidHigh) / 45 + btc7 / 20);
      break;
    case "CHOP":
      // confident in chop when F&G is near 50 and trends are flat
      c = clamp01(0.7 - Math.abs(fg - 50) / 50 - Math.abs(btc7) / 20);
      break;
  }
  return round2(Math.max(c, 0.25));
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round2 = (x: number) => Math.round(x * 100) / 100;
