import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function aroonCalc(c: Candle[], end: number, p: number) {
  const win = c.slice(end - p, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < win.length; k++) { if (win[k].high >= win[hiIdx].high) hiIdx = k; if (win[k].low <= win[loIdx].low) loIdx = k; }
  const up = ((p - (p - hiIdx)) / p) * 100, dn = ((p - (p - loIdx)) / p) * 100;
  return { up, dn };
}

export function randomWalk(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14, a = atr(c, p), i = c.length - 1;
  const denom = a[i] * Math.sqrt(p);
  const rwiHigh = denom ? (c[i].high - c[i - p].low) / denom : 0;
  const rwiLow = denom ? (c[i].low - c[i - p].high) / -denom : 0;
  if (rwiHigh > 1 && rwiHigh > rwiLow) return mk(c, i, "long", atr(c, 14), 0.69, `Random Walk uptrend (${rwiHigh.toFixed(2)})`);
  if (rwiLow > 1 && rwiLow > rwiHigh) return mk(c, i, "short", atr(c, 14), 0.69, `Random Walk downtrend (${rwiLow.toFixed(2)})`);
  return makeSignal({ reason: "Random walk (no trend)" });
}
