import { Candle, Signal, makeSignal, atr, sma, swingHighs, swingLows } from "../indicators";

function pivots(c: Candle[], lb = 5) {
  const sh = swingHighs(c, lb), sl = swingLows(c, lb);
  const highs: { idx: number; price: number }[] = [], lows: { idx: number; price: number }[] = [];
  for (let i = 0; i < c.length; i++) {
    if (sh[i] !== null) highs.push({ idx: i, price: sh[i] as number });
    if (sl[i] !== null) lows.push({ idx: i, price: sl[i] as number });
  }
  return { highs, lows };
}

export function descendingTriangle(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const h2 = highs[highs.length - 1], h1 = highs[highs.length - 2];
  const l2 = lows[lows.length - 1], l1 = lows[lows.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  const flatBottom = Math.abs(l2.price - l1.price) / l1.price < 0.015;
  const fallingHighs = h2.price < h1.price;
  if (flatBottom && fallingHighs && cur.close < l2.price && c[i - 1].close >= l2.price) {
    const sl = h2.price, r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 0.7, cur.close - r * 1.3, cur.close - r * 2], confidence: 0.73, reason: "Descending triangle breakdown" });
  }
  return makeSignal({ reason: "No descending triangle break" });
}
