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

export function doubleBottom(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 5);
  if (lows.length < 2 || highs.length < 1) return makeSignal({ reason: "Not enough pivots" });
  const b2 = lows[lows.length - 1], b1 = lows[lows.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  if (Math.abs(b2.price - b1.price) / b1.price > 0.015) return makeSignal({ reason: "Bottoms not equal" });
  const neckline = Math.max(...highs.filter((h) => h.idx > b1.idx && h.idx < b2.idx).map((h) => h.price), -Infinity);
  if (!isFinite(neckline)) return makeSignal({ reason: "No neckline" });
  if (cur.close > neckline && c[i - 1].close <= neckline) {
    const sl = b2.price - 0.5 * a[i], height = neckline - b2.price;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.74, reason: "Double Bottom neckline break" });
  }
  return makeSignal({ reason: "Double Bottom forming" });
}
