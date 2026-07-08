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

export function doubleTop(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 5);
  if (highs.length < 2 || lows.length < 1) return makeSignal({ reason: "Not enough pivots" });
  const t2 = highs[highs.length - 1], t1 = highs[highs.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // İki tepe birbirine yakın (%1.5)
  if (Math.abs(t2.price - t1.price) / t1.price > 0.015) return makeSignal({ reason: "Tops not equal" });
  const neckline = Math.min(...lows.filter((l) => l.idx > t1.idx && l.idx < t2.idx).map((l) => l.price), Infinity);
  if (!isFinite(neckline)) return makeSignal({ reason: "No neckline" });
  // Neckline kırılımı
  if (cur.close < neckline && c[i - 1].close >= neckline) {
    const sl = t2.price + 0.5 * a[i], r = neckline - cur.close, height = t2.price - neckline;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.74, reason: "Double Top neckline break" });
  }
  return makeSignal({ reason: "Double Top forming" });
}
