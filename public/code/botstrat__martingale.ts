import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function martingale(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14), r = rsi(closes, 14);
  const drop3 = (closes[i] - closes[i - 3]) / closes[i - 3];
  // Keskin düşüş + aşırı satım = martingale ekleme (büyük boyut notu)
  if (drop3 < -0.04 && r[i] < 30) return mk(c, i, "long", a, 0.66, "Martingale add after sharp drop (size up — high risk)", 3, [1, 2, 3.5]);
  return makeSignal({ reason: "No martingale trigger" });
}
