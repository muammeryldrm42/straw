import { Candle, Signal, makeSignal, sma, atr } from "../indicators";

export function whaleBuy(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i];
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  const mult = cur.volume / (avgV || 1);
  if (mult < 5) return makeSignal({ reason: `No whale volume (${mult.toFixed(1)}x)` });
  if (cur.close <= cur.open) return makeSignal({ reason: "Red candle — whale could be selling" });
  // Mum gövdesi range'in %70+'ında ve kapanış üst %25'te
  const range = cur.high - cur.low;
  const body = Math.abs(cur.close - cur.open);
  if (body / range < 0.7) return makeSignal({ reason: "Candle body too weak" });
  const closePos = (cur.close - cur.low) / range;
  if (closePos < 0.75) return makeSignal({ reason: "Close not in upper portion" });
  const a = atr(c, 14), sl = cur.close - a[i] * 1.2, r = cur.close - sl;
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 4, cur.close + r * 6], confidence: 0.78, reason: `🐋 Whale buy ${mult.toFixed(1)}x volume, strong body` });
}
