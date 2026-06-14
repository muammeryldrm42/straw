import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function chochSignal(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 8), sl = swingLows(c, 8);
  const highs: { i: number; v: number }[] = [], lows: { i: number; v: number }[] = [];
  sh.forEach((v, i) => v !== null && highs.push({ i, v }));
  sl.forEach((v, i) => v !== null && lows.push({ i, v }));
  if (highs.length < 3 || lows.length < 3) return makeSignal({ reason: "Insufficient swings" });
  const a = atr(c, 14), cur = c[c.length - 1], ai = a.length - 1;
  // Bearish ChoCH: önceden HH-HL trendi, şimdi son low önceki low'u kırdı
  const lastL = lows[lows.length - 1], prevL = lows[lows.length - 2], prevPrevL = lows[lows.length - 3];
  const lastH = highs[highs.length - 1], prevH = highs[highs.length - 2];
  if (prevPrevL.v < prevL.v && prevH.v < lastH.v && lastL.v < prevL.v) {
    const slv = lastH.v + 0.3 * a[ai], r = slv - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.79, reason: "Bearish ChoCH: HH-HL broken" });
  }
  // Bullish ChoCH: LH-LL'den sonra son high önceki high'ı kırdı
  if (prevPrevL.v > prevL.v && lastH.v > prevH.v && lastL.v > prevL.v) {
    const slv = lastL.v - 0.3 * a[ai], r = cur.close - slv;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.79, reason: "Bullish ChoCH: LH-LL broken" });
  }
  return makeSignal({ reason: "No ChoCH" });
}
