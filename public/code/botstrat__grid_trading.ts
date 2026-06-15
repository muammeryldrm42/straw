import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

export function gridTrading(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), win = c.slice(i - 30, i);
  const hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  const range = hi - lo, levels = 5, step = range / levels, cur = c[i];
  // Alt gridlere değince long (range içinde mean reversion)
  const lowerGrid = lo + step, upperGrid = hi - step;
  if (cur.low <= lowerGrid && cur.close > lowerGrid && range / lo < 0.4) return mk(c, i, "long", a, 0.69, `Grid buy @ lower band (range ${lo.toFixed(2)}-${hi.toFixed(2)})`, 2, [1, 2, 3]);
  if (cur.high >= upperGrid && cur.close < upperGrid && range / lo < 0.4) return mk(c, i, "short", a, 0.69, `Grid sell @ upper band`, 2, [1, 2, 3]);
  return makeSignal({ reason: "Price mid-grid (no fill)" });
}
