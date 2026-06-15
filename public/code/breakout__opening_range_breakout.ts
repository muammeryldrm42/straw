import { Candle, Signal, makeSignal, sma, atr, swingHighs, swingLows } from "../indicators";

export function openingRangeBreakout(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  // Son 60 mumun ilk 15'i = "opening range"
  const window = c.slice(-60);
  const orCandles = window.slice(0, 15);
  const orH = Math.max(...orCandles.map((x) => x.high));
  const orL = Math.min(...orCandles.map((x) => x.low));
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  const volOk = cur.volume > avgV * 1.2;
  // Kırılım son birkaç mumda gerçekleşmeli (taze)
  if (cur.close > orH && prev.close <= orH && volOk) {
    const sl = orL, r = cur.close - (orH + orL) / 2;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: orH - (orH - orL) * 0.5, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3], confidence: 0.72, reason: "Opening range breakout UP + volume" });
  }
  if (cur.close < orL && prev.close >= orL && volOk) {
    const r = (orH + orL) / 2 - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: orL + (orH - orL) * 0.5, take_profit: [cur.close - r * 1, cur.close - r * 2, cur.close - r * 3], confidence: 0.72, reason: "Opening range breakdown DOWN + volume" });
  }
  return makeSignal({ reason: "No opening range breakout" });
}
