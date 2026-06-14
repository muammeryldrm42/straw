import { Candle, Signal, makeSignal, sma, atr, swingHighs, swingLows } from "../indicators";

export function volatilityContraction(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  // Son 3 pencerenin range'i giderek daralmalı
  const w1 = c.slice(-45, -30), w2 = c.slice(-30, -15), w3 = c.slice(-15);
  const range = (w: Candle[]) => Math.max(...w.map((x) => x.high)) - Math.min(...w.map((x) => x.low));
  const r1 = range(w1), r2 = range(w2), r3 = range(w3);
  // Contraction: her pencere bir öncekinden dar
  if (!(r2 < r1 * 0.85 && r3 < r2 * 0.85)) return makeSignal({ reason: "No volatility contraction" });
  // Hacim de düşmeli (kuruma)
  const v1 = sma(w1.map((x) => x.volume), w1.length)[w1.length - 1];
  const v3 = sma(w3.map((x) => x.volume), w3.length)[w3.length - 1];
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const w3H = Math.max(...w3.map((x) => x.high)), w3L = Math.min(...w3.map((x) => x.low));
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  // Kırılım: son daralma penceresinin üstüne + hacim patlaması
  if (cur.close > w3H * 0.999 && cur.volume > avgV * 1.5 && cur.close > cur.open) {
    const sl = w3L, r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.77, reason: "VCP breakout: contraction + volume surge" });
  }
  return makeSignal({ reason: "VCP forming, no breakout yet" });
}
