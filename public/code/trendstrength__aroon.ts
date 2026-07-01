import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function aroonCalc(c: Candle[], end: number, p: number) {
  const win = c.slice(end - p, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < win.length; k++) { if (win[k].high >= win[hiIdx].high) hiIdx = k; if (win[k].low <= win[loIdx].low) loIdx = k; }
  const up = ((p - (p - hiIdx)) / p) * 100, dn = ((p - (p - loIdx)) / p) * 100;
  return { up, dn };
}

export function aroon(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 25, i = c.length - 1, a = atr(c, 14);
  const now = aroonCalc(c, i, p), prev = aroonCalc(c, i - 1, p);
  if (prev.up <= prev.dn && now.up > now.dn && now.up > 70) return mk(c, i, "long", a, 0.71, "Aroon-Up crossed above Aroon-Down");
  if (prev.dn <= prev.up && now.dn > now.up && now.dn > 70) return mk(c, i, "short", a, 0.71, "Aroon-Down crossed above Aroon-Up");
  return makeSignal({ reason: `Aroon up ${now.up.toFixed(0)} / dn ${now.dn.toFixed(0)}` });
}
