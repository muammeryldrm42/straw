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

export function chandeMomentum(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 14, i = c.length - 1, a = atr(c, 14);
  const calc = (end: number) => {
    let up = 0, dn = 0;
    for (let k = end - p + 1; k <= end; k++) { const d = closes[k] - closes[k - 1]; if (d > 0) up += d; else dn += -d; }
    return up + dn === 0 ? 0 : (100 * (up - dn)) / (up + dn);
  };
  const now = calc(i), prev = calc(i - 1);
  if (prev < -50 && now >= -50) return mk(c, i, "long", a, 0.69, `CMO exit oversold (${now.toFixed(0)})`);
  if (prev > 50 && now <= 50) return mk(c, i, "short", a, 0.69, `CMO exit overbought (${now.toFixed(0)})`);
  return makeSignal({ reason: `CMO ${now.toFixed(0)}` });
}
