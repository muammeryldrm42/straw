import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function trailingStop(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 22);
  const highest = Math.max(...c.slice(i - 22, i + 1).map((x) => x.high));
  const lowest = Math.min(...c.slice(i - 22, i + 1).map((x) => x.low));
  const longStop = highest - a[i] * 3, shortStop = lowest + a[i] * 3;
  // Fiyat trailing stop'u koruyor + yükseliyor = trend takip girişi
  if (closes[i] > longStop && closes[i - 1] <= (Math.max(...c.slice(i - 23, i).map((x) => x.high)) - a[i - 1] * 3)) return mk(c, i, "long", a, 0.69, "Trailing-stop bot: long trend follow", 3, [2, 4, 6]);
  if (closes[i] < shortStop && closes[i - 1] >= (Math.min(...c.slice(i - 23, i).map((x) => x.low)) + a[i - 1] * 3)) return mk(c, i, "short", a, 0.69, "Trailing-stop bot: short trend follow", 3, [2, 4, 6]);
  return makeSignal({ reason: "Trailing stop holding" });
}
