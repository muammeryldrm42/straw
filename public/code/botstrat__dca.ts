import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function dca(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const trend = sma(closes, 50), r = rsi(closes, 14);
  // Genel yükseliş + pullback (RSI < 45) = DCA giriş noktası
  if (closes[i] > trend[i] && r[i] < 45 && closes[i] < closes[i - 3]) return mk(c, i, "long", a, 0.7, "DCA buy: dip within uptrend", 3, [1.5, 3, 5]);
  return makeSignal({ reason: "No DCA entry (not a dip in uptrend)" });
}
