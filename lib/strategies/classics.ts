import { Candle, Signal, makeSignal, atr, sma, ema } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

// ---- helpers ----
// ATR-tabanlı Renko brick yön dizisi (+1 yeşil / -1 kırmızı)
function renkoDir(c: Candle[], i: number, brick: number) {
  let last = c[Math.max(0, i - 60)].close;
  let dir = 0, prevDir = 0;
  for (let k = Math.max(1, i - 60); k <= i; k++) {
    const cl = c[k].close;
    while (cl >= last + brick) { prevDir = dir; dir = 1; last += brick; }
    while (cl <= last - brick) { prevDir = dir; dir = -1; last -= brick; }
  }
  return { dir, prevDir };
}
// Symmetrically Weighted MA (RVI için)
function swma(v: number[], i: number) { return i < 3 ? v[i] : (v[i] + 2 * v[i - 1] + 2 * v[i - 2] + v[i - 3]) / 6; }
function rviArr(c: Candle[]) {
  const num: number[] = [], den: number[] = [];
  for (let i = 0; i < c.length; i++) { num.push(swma(c.map((x) => x.close - x.open), i)); den.push(swma(c.map((x) => x.high - x.low), i)); }
  const rvi = num.map((n, i) => { const d = den[i]; return d ? n / d : 0; });
  const sig = rvi.map((_, i) => swma(rvi, i));
  return { rvi, sig };
}
function bopArr(c: Candle[]) { return c.map((x) => (x.high - x.low) ? (x.close - x.open) / (x.high - x.low) : 0); }
function mcginley(c: Candle[], n = 14) {
  const md: number[] = [c[0].close];
  for (let i = 1; i < c.length; i++) { const prev = md[i - 1]; const ratio = prev ? c[i].close / prev : 1; md.push(prev + (c[i].close - prev) / Math.max(1, n * Math.pow(ratio, 4))); }
  return md;
}
function zlema(values: number[], n: number) {
  const lag = Math.floor((n - 1) / 2);
  const adj = values.map((v, i) => v + (v - (values[i - lag] ?? v)));
  return ema(adj, n);
}
function rci(c: Candle[], i: number, n = 9) {
  if (i < n) return 0;
  const win = c.slice(i - n + 1, i + 1).map((x) => x.close);
  const priceRank = win.map((v) => win.filter((w) => w > v).length + 1);
  let d2 = 0; for (let k = 0; k < n; k++) { const timeRank = n - k; d2 += (timeRank - priceRank[k]) ** 2; }
  return (1 - (6 * d2) / (n * (n * n - 1))) * 100;
}
function zigzag(c: Candle[], i: number, dev = 0.03) {
  // son swing yönü: %dev sapmayla pivot tespiti
  let pivot = c[Math.max(0, i - 50)].close, dir = 0, lastPivotIdx = Math.max(0, i - 50);
  for (let k = lastPivotIdx + 1; k <= i; k++) {
    const ch = (c[k].close - pivot) / pivot;
    if (dir >= 0 && ch <= -dev) { dir = -1; pivot = c[k].close; lastPivotIdx = k; }
    else if (dir <= 0 && ch >= dev) { dir = 1; pivot = c[k].close; lastPivotIdx = k; }
    else if (dir >= 0 && c[k].close > pivot) pivot = c[k].close;
    else if (dir <= 0 && c[k].close < pivot) pivot = c[k].close;
  }
  return { dir, lastPivotIdx };
}

// 1. Renko trend (brick direction continuation)
export function renkoTrend(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { dir, prevDir } = renkoDir(c, i, a[i]);
  if (dir === 1 && prevDir <= 0) return mk(c, i, "long", a, 0.71, "Renko flipped to green bricks (uptrend)");
  if (dir === -1 && prevDir >= 0) return mk(c, i, "short", a, 0.71, "Renko flipped to red bricks (downtrend)");
  return makeSignal({ reason: "No Renko flip" });
}
// 2. Renko reversal (single counter brick after run)
export function renkoReversal(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { dir, prevDir } = renkoDir(c, i, a[i] * 1.5);
  if (dir === 1 && prevDir === -1) return mk(c, i, "long", a, 0.69, "Renko reversal brick (red→green)");
  if (dir === -1 && prevDir === 1) return mk(c, i, "short", a, 0.69, "Renko reversal brick (green→red)");
  return makeSignal({ reason: "No Renko reversal" });
}
// 3. Renko + RVI combo (popular trend-following)
export function renkoRvi(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { dir } = renkoDir(c, i, a[i]), { rvi, sig } = rviArr(c);
  if (dir === 1 && rvi[i] > sig[i] && rvi[i - 1] <= sig[i - 1]) return mk(c, i, "long", a, 0.73, "Renko green + RVI bullish cross");
  if (dir === -1 && rvi[i] < sig[i] && rvi[i - 1] >= sig[i - 1]) return mk(c, i, "short", a, 0.73, "Renko red + RVI bearish cross");
  return makeSignal({ reason: "No Renko+RVI alignment" });
}
// 4. Relative Vigor Index cross
export function relativeVigor(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { rvi, sig } = rviArr(c);
  if (rvi[i] > sig[i] && rvi[i - 1] <= sig[i - 1]) return mk(c, i, "long", a, 0.69, "RVI crossed above its signal line");
  if (rvi[i] < sig[i] && rvi[i - 1] >= sig[i - 1]) return mk(c, i, "short", a, 0.69, "RVI crossed below its signal line");
  return makeSignal({ reason: "No RVI cross" });
}
// 5. Traders Dynamic Index (TDI)
export function tradersDynamicIndex(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), closes = c.map((x) => x.close);
  // RSI 13 + hızlı(2)/yavaş(7) MA + bollinger bandı
  const rsiArr = (() => { const out: number[] = []; let g = 0, l = 0; for (let k = 1; k < closes.length; k++) { const ch = closes[k] - closes[k - 1]; g = (g * 12 + Math.max(ch, 0)) / 13; l = (l * 12 + Math.max(-ch, 0)) / 13; out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l)); } out.unshift(50); return out; })();
  const fast = sma(rsiArr, 2), slow = sma(rsiArr, 7);
  if (fast[i] > slow[i] && fast[i - 1] <= slow[i - 1] && rsiArr[i] > 50) return mk(c, i, "long", a, 0.7, "TDI fast crossed above slow (bullish)");
  if (fast[i] < slow[i] && fast[i - 1] >= slow[i - 1] && rsiArr[i] < 50) return mk(c, i, "short", a, 0.7, "TDI fast crossed below slow (bearish)");
  return makeSignal({ reason: "No TDI cross" });
}
// 6. Balance of Power
export function balanceOfPower(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), bop = sma(bopArr(c), 14);
  if (bop[i] > 0 && bop[i - 1] <= 0) return mk(c, i, "long", a, 0.68, "Balance of Power turned positive (buyers in control)");
  if (bop[i] < 0 && bop[i - 1] >= 0) return mk(c, i, "short", a, 0.68, "Balance of Power turned negative (sellers in control)");
  return makeSignal({ reason: "No BOP zero-cross" });
}
// 7. McGinley Dynamic cross
export function mcginleyDynamic(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), md = mcginley(c, 14);
  if (c[i].close > md[i] && c[i - 1].close <= md[i - 1]) return mk(c, i, "long", a, 0.69, "Price crossed above McGinley Dynamic");
  if (c[i].close < md[i] && c[i - 1].close >= md[i - 1]) return mk(c, i, "short", a, 0.69, "Price crossed below McGinley Dynamic");
  return makeSignal({ reason: "No McGinley cross" });
}
// 8. Zero-Lag EMA cross
export function zlemaCross(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), closes = c.map((x) => x.close);
  const fast = zlema(closes, 9), slow = zlema(closes, 21);
  if (fast[i] > slow[i] && fast[i - 1] <= slow[i - 1]) return mk(c, i, "long", a, 0.7, "Zero-Lag EMA bullish cross");
  if (fast[i] < slow[i] && fast[i - 1] >= slow[i - 1]) return mk(c, i, "short", a, 0.7, "Zero-Lag EMA bearish cross");
  return makeSignal({ reason: "No ZLEMA cross" });
}
// 9. RCI (Rank Correlation Index)
export function rciCross(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = rci(c, i, 9), prev = rci(c, i - 1, 9);
  if (now > -80 && prev <= -80) return mk(c, i, "long", a, 0.68, "RCI turning up from oversold (-80)");
  if (now < 80 && prev >= 80) return mk(c, i, "short", a, 0.68, "RCI turning down from overbought (+80)");
  return makeSignal({ reason: "RCI mid-range" });
}
// 10. ZigZag swing break
export function zigzagBreak(c: Candle[]): Signal {
  if (c.length < 55) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), z = zigzag(c, i, 0.03);
  if (z.dir === 1 && c[i].close > c[z.lastPivotIdx].close && c[i - 1].close <= c[z.lastPivotIdx].close) return mk(c, i, "long", a, 0.68, "ZigZag confirmed higher swing (uptrend)");
  if (z.dir === -1 && c[i].close < c[z.lastPivotIdx].close && c[i - 1].close >= c[z.lastPivotIdx].close) return mk(c, i, "short", a, 0.68, "ZigZag confirmed lower swing (downtrend)");
  return makeSignal({ reason: "No ZigZag break" });
}
// 11. Murrey Math levels
export function murreyMath(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), w = c.slice(i - 30, i + 1);
  const hi = Math.max(...w.map((x) => x.high)), lo = Math.min(...w.map((x) => x.low)), rng = hi - lo;
  if (rng <= 0) return makeSignal({ reason: "No range" });
  const lv = (n: number) => lo + (rng * n) / 8;
  // 0/8 ve 8/8 ekstrem; 2/8 ve 6/8 dönüş bölgeleri; 4/8 ana destek/direnç
  if (c[i].low <= lv(2) && c[i].close > lv(2) && c[i].close > c[i].open) return mk(c, i, "long", a, 0.68, "Murrey 2/8 bounce (oversold pivot)");
  if (c[i].high >= lv(6) && c[i].close < lv(6) && c[i].close < c[i].open) return mk(c, i, "short", a, 0.68, "Murrey 6/8 rejection (overbought pivot)");
  return makeSignal({ reason: "Between Murrey levels" });
}
// 12. Gann angle (1x1 trendline)
export function gannFan(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), w = c.slice(i - 40, i + 1);
  let loIdx = 0, hiIdx = 0;
  for (let k = 0; k < w.length; k++) { if (w[k].low < w[loIdx].low) loIdx = k; if (w[k].high > w[hiIdx].high) hiIdx = k; }
  const unit = a[i]; // 1x1 açı = bar başına 1 birim (ATR)
  if (hiIdx < loIdx) { // dip daha yeni → yukarı 1x1
    const bars = w.length - 1 - loIdx; const gann = w[loIdx].low + unit * bars;
    if (c[i - 1].close <= gann && c[i].close > gann) return mk(c, i, "long", a, 0.67, "Price broke above Gann 1x1 up angle");
  } else {
    const bars = w.length - 1 - hiIdx; const gann = w[hiIdx].high - unit * bars;
    if (c[i - 1].close >= gann && c[i].close < gann) return mk(c, i, "short", a, 0.67, "Price broke below Gann 1x1 down angle");
  }
  return makeSignal({ reason: "No Gann angle break" });
}
