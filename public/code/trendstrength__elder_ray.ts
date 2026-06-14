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

export function elderRay(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 13), i = c.length - 1, a = atr(c, 14);
  const bull = c[i].high - e[i], bear = c[i].low - e[i];
  const bullPrev = c[i - 1].high - e[i - 1], bearPrev = c[i - 1].low - e[i - 1];
  // Uptrend (EMA yukarı) + bear power negatiften artıyor = long
  if (e[i] > e[i - 1] && bear < 0 && bear > bearPrev) return mk(c, i, "long", a, 0.7, "Elder Ray: bear power rising in uptrend");
  if (e[i] < e[i - 1] && bull > 0 && bull < bullPrev) return mk(c, i, "short", a, 0.7, "Elder Ray: bull power falling in downtrend");
  return makeSignal({ reason: "Elder Ray neutral" });
}
