import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function antiMartingale(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14), e = ema(closes, 21);
  const up3 = closes[i] > closes[i - 1] && closes[i - 1] > closes[i - 2] && closes[i - 2] > closes[i - 3];
  // Trend yönünde 3 ardışık yükseliş + EMA üstü = piramitleme
  if (closes[i] > e[i] && up3 && e[i] > e[i - 3]) return mk(c, i, "long", a, 0.7, "Anti-Martingale: pyramid into uptrend strength", 2, [1.5, 3, 5]);
  const dn3 = closes[i] < closes[i - 1] && closes[i - 1] < closes[i - 2] && closes[i - 2] < closes[i - 3];
  if (closes[i] < e[i] && dn3 && e[i] < e[i - 3]) return mk(c, i, "short", a, 0.7, "Anti-Martingale: pyramid into downtrend strength", 2, [1.5, 3, 5]);
  return makeSignal({ reason: "No pyramiding trigger" });
}
