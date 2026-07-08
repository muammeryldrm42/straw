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

export function rectangle(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const recentH = highs.slice(-2), recentL = lows.slice(-2);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  const resistance = recentH.reduce((s, h) => s + h.price, 0) / recentH.length;
  const support = recentL.reduce((s, l) => s + l.price, 0) / recentL.length;
  // Tepeler ve dipler düz (rectangle)
  const flatRes = Math.abs(recentH[0].price - recentH[1].price) / resistance < 0.015;
  const flatSup = Math.abs(recentL[0].price - recentL[1].price) / support < 0.015;
  if (!flatRes || !flatSup) return makeSignal({ reason: "No rectangle" });
  const height = resistance - support;
  if (cur.close > resistance && c[i - 1].close <= resistance) {
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: resistance - height * 0.5, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.71, reason: "Rectangle breakout up" });
  }
  if (cur.close < support && c[i - 1].close >= support) {
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: support + height * 0.5, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.71, reason: "Rectangle breakdown down" });
  }
  return makeSignal({ reason: "Price inside rectangle" });
}
