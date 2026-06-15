import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function twapEntry(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const twap = closes.slice(i - 20, i + 1).reduce((x, y) => x + y, 0) / 21;
  const e = ema(closes, 50);
  // Fiyat TWAP altına sarkıp yukarı trendde = kademeli TWAP alımı
  if (closes[i] > e[i] && closes[i] < twap && closes[i] > closes[i - 1]) return mk(c, i, "long", a, 0.68, "TWAP entry: below TWAP in uptrend", 2.5, [1.5, 3, 4.5]);
  if (closes[i] < e[i] && closes[i] > twap && closes[i] < closes[i - 1]) return mk(c, i, "short", a, 0.68, "TWAP entry: above TWAP in downtrend", 2.5, [1.5, 3, 4.5]);
  return makeSignal({ reason: "No TWAP entry" });
}
