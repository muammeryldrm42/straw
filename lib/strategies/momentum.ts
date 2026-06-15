import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slMult = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slMult * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + slMult * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

function stochKD(c: Candle[], kP: number, smooth: number, dP: number) {
  const raw: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i < kP - 1) { raw.push(50); continue; }
    const win = c.slice(i - kP + 1, i + 1);
    const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
    raw.push(hh === ll ? 50 : ((c[i].close - ll) / (hh - ll)) * 100);
  }
  const k = sma(raw, smooth), d = sma(k, dP);
  return { k, d };
}

// 1. Stochastic (fast 14/3/3)
export function stochastic(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { k, d } = stochKD(c, 14, 3, 3), i = c.length - 1, a = atr(c, 14);
  if (k[i] < 20 && k[i - 1] <= d[i - 1] && k[i] > d[i]) return mk(c, i, "long", a, 0.71, `Stochastic bullish cross @ oversold (${k[i].toFixed(0)})`);
  if (k[i] > 80 && k[i - 1] >= d[i - 1] && k[i] < d[i]) return mk(c, i, "short", a, 0.71, `Stochastic bearish cross @ overbought (${k[i].toFixed(0)})`);
  return makeSignal({ reason: `Stochastic ${k[i].toFixed(0)}` });
}

// 2. Slow Stochastic (14/3 then 3)
export function stochasticSlow(c: Candle[]): Signal {
  if (c.length < 35) return makeSignal({ reason: "Insufficient data" });
  const { k, d } = stochKD(c, 14, 5, 5), i = c.length - 1, a = atr(c, 14);
  if (k[i] < 25 && k[i - 1] <= d[i - 1] && k[i] > d[i]) return mk(c, i, "long", a, 0.7, "Slow stochastic bullish cross");
  if (k[i] > 75 && k[i - 1] >= d[i - 1] && k[i] < d[i]) return mk(c, i, "short", a, 0.7, "Slow stochastic bearish cross");
  return makeSignal({ reason: `Slow stochastic ${k[i].toFixed(0)}` });
}

// 3. Connors RSI (composite)
export function connorsRsi(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const r3 = rsi(closes, 3);
  // streak
  const streak: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) streak.push(streak[i - 1] > 0 ? streak[i - 1] + 1 : 1);
    else if (closes[i] < closes[i - 1]) streak.push(streak[i - 1] < 0 ? streak[i - 1] - 1 : -1);
    else streak.push(0);
  }
  const rStreak = rsi(streak, 2);
  const i = c.length - 1, a = atr(c, 14);
  const crsi = (r3[i] + rStreak[i] + 50) / 3; // simplified (percentrank≈50)
  if (crsi < 20) return mk(c, i, "long", a, 0.72, `Connors RSI oversold (${crsi.toFixed(0)})`);
  if (crsi > 80) return mk(c, i, "short", a, 0.72, `Connors RSI overbought (${crsi.toFixed(0)})`);
  return makeSignal({ reason: `Connors RSI ${crsi.toFixed(0)}` });
}

// 4. TSI - True Strength Index
export function tsi(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const mom = closes.map((v, i) => (i === 0 ? 0 : v - closes[i - 1]));
  const absMom = mom.map(Math.abs);
  const sm = (arr: number[]) => ema(ema(arr, 25), 13);
  const tsiArr = sm(mom).map((v, i) => { const d = sm(absMom)[i]; return d ? (100 * v) / d : 0; });
  const sig = ema(tsiArr, 7);
  const i = c.length - 1, a = atr(c, 14);
  if (tsiArr[i - 1] <= sig[i - 1] && tsiArr[i] > sig[i]) return mk(c, i, "long", a, 0.7, "TSI bullish signal cross");
  if (tsiArr[i - 1] >= sig[i - 1] && tsiArr[i] < sig[i]) return mk(c, i, "short", a, 0.7, "TSI bearish signal cross");
  return makeSignal({ reason: `TSI ${tsiArr[i].toFixed(1)}` });
}

// 5. KST - Know Sure Thing
export function kst(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rocSma = (n: number, s: number) => {
    const r = closes.map((v, i) => (i >= n ? ((v - closes[i - n]) / closes[i - n]) * 100 : 0));
    return sma(r, s);
  };
  const k1 = rocSma(10, 10), k2 = rocSma(15, 10), k3 = rocSma(20, 10), k4 = rocSma(30, 15);
  const kstArr = k1.map((v, i) => v + 2 * k2[i] + 3 * k3[i] + 4 * k4[i]);
  const sig = sma(kstArr, 9);
  const i = c.length - 1, a = atr(c, 14);
  if (kstArr[i - 1] <= sig[i - 1] && kstArr[i] > sig[i]) return mk(c, i, "long", a, 0.71, "KST bullish cross");
  if (kstArr[i - 1] >= sig[i - 1] && kstArr[i] < sig[i]) return mk(c, i, "short", a, 0.71, "KST bearish cross");
  return makeSignal({ reason: "No KST cross" });
}

// 6. DMI - Directional Movement (+DI/-DI cross, no ADX gate)
export function dmi(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14, plusDM: number[] = [], minusDM: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) {
    const up = c[k].high - c[k - 1].high, dn = c[k - 1].low - c[k].low;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close)));
  }
  const sm = (arr: number[]) => ema(arr, p);
  const trS = sm(tr), pdi = sm(plusDM).map((v, i) => (trS[i] ? (100 * v) / trS[i] : 0)), mdi = sm(minusDM).map((v, i) => (trS[i] ? (100 * v) / trS[i] : 0));
  const j = pdi.length - 1, i = c.length - 1, a = atr(c, 14);
  if (pdi[j - 1] <= mdi[j - 1] && pdi[j] > mdi[j]) return mk(c, i, "long", a, 0.7, "+DI crossed above -DI");
  if (mdi[j - 1] <= pdi[j - 1] && mdi[j] > pdi[j]) return mk(c, i, "short", a, 0.7, "-DI crossed above +DI");
  return makeSignal({ reason: "No DI cross" });
}

// 7. Vortex Indicator
export function vortex(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const vmPlus: number[] = [], vmMinus: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) {
    vmPlus.push(Math.abs(c[k].high - c[k - 1].low));
    vmMinus.push(Math.abs(c[k].low - c[k - 1].high));
    tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close)));
  }
  const sum = (arr: number[], end: number) => arr.slice(end - p + 1, end + 1).reduce((a, b) => a + b, 0);
  const j = vmPlus.length - 1;
  const viP = sum(vmPlus, j) / sum(tr, j), viM = sum(vmMinus, j) / sum(tr, j);
  const viPprev = sum(vmPlus, j - 1) / sum(tr, j - 1), viMprev = sum(vmMinus, j - 1) / sum(tr, j - 1);
  const i = c.length - 1, a = atr(c, 14);
  if (viPprev <= viMprev && viP > viM) return mk(c, i, "long", a, 0.71, "Vortex VI+ crossed above VI-");
  if (viMprev <= viPprev && viM > viP) return mk(c, i, "short", a, 0.71, "Vortex VI- crossed above VI+");
  return makeSignal({ reason: "No vortex cross" });
}

// 8. Fisher Transform
export function fisherTransform(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 10, med = c.map((x) => (x.high + x.low) / 2);
  const fish: number[] = [], val: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i < p) { fish.push(0); val.push(0); continue; }
    const win = med.slice(i - p + 1, i + 1);
    const mn = Math.min(...win), mx = Math.max(...win);
    let v = mx === mn ? 0 : 0.66 * ((med[i] - mn) / (mx - mn) - 0.5) + 0.67 * val[i - 1];
    v = Math.max(-0.999, Math.min(0.999, v));
    val.push(v);
    fish.push(0.5 * Math.log((1 + v) / (1 - v)) + 0.5 * fish[i - 1]);
  }
  const i = c.length - 1, a = atr(c, 14);
  if (fish[i - 1] <= 0 && fish[i] > 0) return mk(c, i, "long", a, 0.7, "Fisher Transform turned positive");
  if (fish[i - 1] >= 0 && fish[i] < 0) return mk(c, i, "short", a, 0.7, "Fisher Transform turned negative");
  return makeSignal({ reason: `Fisher ${fish[i].toFixed(2)}` });
}

// 9. Schaff Trend Cycle (simplified)
export function schaffTrend(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const m = macdLine(closes, 23, 50);
  const stc = stochOf(m, 10);
  const i = c.length - 1, a = atr(c, 14);
  if (stc[i - 1] < 25 && stc[i] >= 25) return mk(c, i, "long", a, 0.71, "Schaff Trend Cycle turned up from oversold");
  if (stc[i - 1] > 75 && stc[i] <= 75) return mk(c, i, "short", a, 0.71, "Schaff Trend Cycle turned down from overbought");
  return makeSignal({ reason: `STC ${stc[i].toFixed(0)}` });
}
function macdLine(closes: number[], f: number, s: number) { const ef = ema(closes, f), es = ema(closes, s); return ef.map((v, i) => v - es[i]); }
function stochOf(arr: number[], p: number) {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < p - 1) { out.push(50); continue; }
    const win = arr.slice(i - p + 1, i + 1); const mn = Math.min(...win), mx = Math.max(...win);
    out.push(mx === mn ? 50 : ((arr[i] - mn) / (mx - mn)) * 100);
  }
  return out;
}

// 10. RSI-2 (Connors short-term mean reversion)
export function rsi2(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const r = rsi(closes, 2);
  const trend = sma(closes, Math.min(200, Math.floor(c.length / 2)));
  const i = c.length - 1, a = atr(c, 14);
  if (closes[i] > trend[i] && r[i] < 10) return mk(c, i, "long", a, 0.73, `RSI-2 dip in uptrend (${r[i].toFixed(0)})`);
  if (closes[i] < trend[i] && r[i] > 90) return mk(c, i, "short", a, 0.73, `RSI-2 spike in downtrend (${r[i].toFixed(0)})`);
  return makeSignal({ reason: `RSI-2 ${r[i].toFixed(0)}` });
}

// 11. Momentum Oscillator zero cross
export function momentumOsc(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 10, closes = c.map((x) => x.close);
  const momArr = closes.map((v, i) => (i >= p ? v - closes[i - p] : 0));
  const sig = sma(momArr, 9);
  const i = c.length - 1, a = atr(c, 14);
  if (momArr[i - 1] <= sig[i - 1] && momArr[i] > sig[i]) return mk(c, i, "long", a, 0.68, "Momentum crossed above its signal");
  if (momArr[i - 1] >= sig[i - 1] && momArr[i] < sig[i]) return mk(c, i, "short", a, 0.68, "Momentum crossed below its signal");
  return makeSignal({ reason: "No momentum cross" });
}

// 12. RMI - Relative Momentum Index
export function relativeMomentumIndex(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 14, mom = 4;
  const up: number[] = [], dn: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < mom) { up.push(0); dn.push(0); continue; }
    const diff = closes[i] - closes[i - mom];
    up.push(diff > 0 ? diff : 0); dn.push(diff < 0 ? -diff : 0);
  }
  const upE = ema(up, p), dnE = ema(dn, p);
  const rmi = upE.map((v, i) => (v + dnE[i] === 0 ? 50 : (100 * v) / (v + dnE[i])));
  const i = c.length - 1, a = atr(c, 14);
  if (rmi[i - 1] < 30 && rmi[i] >= 30) return mk(c, i, "long", a, 0.69, `RMI exit oversold (${rmi[i].toFixed(0)})`);
  if (rmi[i - 1] > 70 && rmi[i] <= 70) return mk(c, i, "short", a, 0.69, `RMI exit overbought (${rmi[i].toFixed(0)})`);
  return makeSignal({ reason: `RMI ${rmi[i].toFixed(0)}` });
}
