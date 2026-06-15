import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function breakoutGrid(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  const step = (hi - lo) / 4;
  // Üst grid çizgisini kırınca trend yönünde ekle
  if (cur.close > hi && c[i - 1].close <= hi) return mk(c, i, "long", a, 0.7, "Breakout grid: new upper level broken", 2, [2, 3.5, 5]);
  if (cur.close < lo && c[i - 1].close >= lo) return mk(c, i, "short", a, 0.7, "Breakout grid: new lower level broken", 2, [2, 3.5, 5]);
  return makeSignal({ reason: "No grid breakout" });
}
