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

export function inverseHeadShoulders(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (lows.length < 3 || highs.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const [ls, head, rs] = lows.slice(-3);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  if (!(head.price < ls.price && head.price < rs.price)) return makeSignal({ reason: "No iH&S structure" });
  if (Math.abs(ls.price - rs.price) / ls.price > 0.03) return makeSignal({ reason: "Shoulders uneven" });
  const neckHighs = highs.filter((h) => h.idx > ls.idx && h.idx < rs.idx);
  if (neckHighs.length < 1) return makeSignal({ reason: "No neckline" });
  const neckline = neckHighs.reduce((s, h) => s + h.price, 0) / neckHighs.length;
  if (cur.close > neckline && c[i - 1].close <= neckline) {
    const sl = rs.price - 0.5 * a[i], height = neckline - head.price;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.76, reason: "Inverse H&S neckline break" });
  }
  return makeSignal({ reason: "iH&S forming" });
}
