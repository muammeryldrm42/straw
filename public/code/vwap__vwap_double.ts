import { Candle, Signal, makeSignal, atr, sma } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function rollingVwap(c: Candle[], end: number, p: number) {
  let pv = 0, vol = 0;
  const tps: number[] = [], wts: number[] = [];
  for (let k = end - p + 1; k <= end; k++) { const tp = (c[k].high + c[k].low + c[k].close) / 3; pv += tp * c[k].volume; vol += c[k].volume; tps.push(tp); wts.push(c[k].volume); }
  const vwap = vol ? pv / vol : c[end].close;
  // hacim ağırlıklı std
  let varSum = 0; for (let j = 0; j < tps.length; j++) varSum += wts[j] * (tps[j] - vwap) ** 2;
  const sd = vol ? Math.sqrt(varSum / vol) : 0;
  return { vwap, sd };
}
function anchoredVwap(c: Candle[], end: number, span = 50) {
  let anchor = end - span; if (anchor < 0) anchor = 0;
  // span içindeki en düşük low'u anchor al
  let lowIdx = anchor; for (let k = anchor; k <= end; k++) if (c[k].low < c[lowIdx].low) lowIdx = k;
  let pv = 0, vol = 0; for (let k = lowIdx; k <= end; k++) { const tp = (c[k].high + c[k].low + c[k].close) / 3; pv += tp * c[k].volume; vol += c[k].volume; }
  return vol ? pv / vol : c[end].close;
}

export function doubleVwap(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const fast = rollingVwap(c, i, 20).vwap, slow = rollingVwap(c, i, 50).vwap;
  const fastP = rollingVwap(c, i - 1, 20).vwap, slowP = rollingVwap(c, i - 1, 50).vwap;
  if (fastP <= slowP && fast > slow) return mk(c, i, "long", a, 0.69, "Fast VWAP crossed above slow VWAP");
  if (fastP >= slowP && fast < slow) return mk(c, i, "short", a, 0.69, "Fast VWAP crossed below slow VWAP");
  return makeSignal({ reason: "No double-VWAP cross" });
}
