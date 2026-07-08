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

export function headShoulders(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 3 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const [ls, head, rs] = highs.slice(-3);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // Head iki omuzdan yüksek, omuzlar benzer
  if (!(head.price > ls.price && head.price > rs.price)) return makeSignal({ reason: "No H&S structure" });
  if (Math.abs(ls.price - rs.price) / ls.price > 0.03) return makeSignal({ reason: "Shoulders uneven" });
  const neckLows = lows.filter((l) => l.idx > ls.idx && l.idx < rs.idx);
  if (neckLows.length < 1) return makeSignal({ reason: "No neckline" });
  const neckline = neckLows.reduce((s, l) => s + l.price, 0) / neckLows.length;
  if (cur.close < neckline && c[i - 1].close >= neckline) {
    const sl = rs.price + 0.5 * a[i], height = head.price - neckline;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.76, reason: "Head & Shoulders neckline break" });
  }
  return makeSignal({ reason: "H&S forming" });
}
