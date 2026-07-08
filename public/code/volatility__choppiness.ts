import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function choppiness(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const a = atr(c, 1); // 1-period TR
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const win = c.slice(i - p + 1, i + 1);
  const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
  const atrSum = a.slice(i - p + 1, i + 1).reduce((s, v) => s + v, 0);
  const ci = (100 * Math.log10(atrSum / (hh - ll || 1e-9))) / Math.log10(p);
  const a14 = atr(c, 14);
  // CI < 38.2 = güçlü trend; yön için kırılım
  if (ci < 38.2) {
    if (cur.close > hh * 0.999 && cur.close > cur.open) {
      const sl = cur.close - 2 * a14[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: `Low choppiness (${ci.toFixed(0)}) + breakout up` });
    }
    if (cur.close < ll * 1.001 && cur.close < cur.open) {
      const sl = cur.close + 2 * a14[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: `Low choppiness (${ci.toFixed(0)}) + breakdown` });
    }
  }
  return makeSignal({ reason: `Choppiness ${ci.toFixed(0)} (${ci > 61.8 ? "ranging" : "neutral"})` });
}
