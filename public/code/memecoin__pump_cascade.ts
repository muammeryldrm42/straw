import { Candle, Signal, makeSignal, sma, atr } from "../indicators";

export function pumpCascade(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const last7 = c.slice(-7);
  const greens = last7.filter((x) => x.close > x.open).length;
  if (greens < 5) return makeSignal({ reason: `No cascade (${greens}/7 green)` });
  // Mum boyları artıyor mu?
  const sizes = last7.map((x) => Math.abs(x.close - x.open));
  const firstHalf = sizes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const secondHalf = sizes.slice(-3).reduce((a, b) => a + b, 0) / 3;
  if (secondHalf < firstHalf * 1.1) return makeSignal({ reason: "Momentum weakening" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // Geç giriş riski - hızlı SL, kademeli TP
  const sl = cur.close - a[i] * 1.5, r = cur.close - sl;
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3.5], confidence: 0.65, reason: `🚀 Pump cascade ${greens}/7 green, momentum rising` });
}
