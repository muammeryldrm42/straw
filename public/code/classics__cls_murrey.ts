import { Candle, Signal, makeSignal, atr, sma, ema } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
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
