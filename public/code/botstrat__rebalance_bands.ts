import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function rebalanceBands(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const anchor = sma(closes, 50)[i]; // hedef "değer" ortalaması
  const drift = (closes[i] - anchor) / anchor;
  // Fiyat hedefin %8 altına düşünce al (underweight), %8 üstüne çıkınca sat (overweight)
  if (drift <= -0.08) return mk(c, i, "long", a, 0.68, `Rebalance: underweight (${(drift * 100).toFixed(0)}% below anchor)`, 3, [1.5, 3, 5]);
  if (drift >= 0.08) return mk(c, i, "short", a, 0.68, `Rebalance: overweight (${(drift * 100).toFixed(0)}% above anchor)`, 3, [1.5, 3, 5]);
  return makeSignal({ reason: `Within rebalance band (${(drift * 100).toFixed(0)}%)` });
}
