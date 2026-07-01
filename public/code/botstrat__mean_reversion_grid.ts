import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function meanReversionGrid(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const ma = sma(closes, 20), win = closes.slice(i - 20, i + 1), mean = win.reduce((x, y) => x + y, 0) / 21;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / 21);
  const dev = sd ? (closes[i] - ma[i]) / sd : 0;
  // Ortalamadan -1.5σ/-2.5σ gridlerde long, +tarafta short (range piyasası)
  if (dev <= -1.5 && dev > -3) return mk(c, i, "long", a, 0.7, `Mean-reversion grid long (${dev.toFixed(1)}σ below mean)`, 2, [1, 2, 3]);
  if (dev >= 1.5 && dev < 3) return mk(c, i, "short", a, 0.7, `Mean-reversion grid short (${dev.toFixed(1)}σ above mean)`, 2, [1, 2, 3]);
  return makeSignal({ reason: `Within grid (${dev.toFixed(1)}σ)` });
}
