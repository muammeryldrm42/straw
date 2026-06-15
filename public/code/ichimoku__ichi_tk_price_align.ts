import { Candle, Signal, makeSignal, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function ichi(c: Candle[], end: number) {
  const hh = (n: number) => Math.max(...c.slice(end - n + 1, end + 1).map((x) => x.high));
  const ll = (n: number) => Math.min(...c.slice(end - n + 1, end + 1).map((x) => x.low));
  const tenkan = (hh(9) + ll(9)) / 2;
  const kijun = (hh(26) + ll(26)) / 2;
  const spanA = (tenkan + kijun) / 2;
  const spanB = (hh(52) + ll(52)) / 2;
  return { tenkan, kijun, spanA, spanB };
}
function cloud(c: Candle[], i: number) {
  const past = ichi(c, i - 26);
  return { top: Math.max(past.spanA, past.spanB), bot: Math.min(past.spanA, past.spanB), spanA: past.spanA, spanB: past.spanB };
}

export function tkPriceAlign(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), cl = cloud(c, i);
  const bull = now.tenkan > now.kijun && c[i].close > cl.top && c[i].close > now.tenkan;
  const bear = now.tenkan < now.kijun && c[i].close < cl.bot && c[i].close < now.tenkan;
  const prev = ichi(c, i - 1), clPrev = cloud(c, i - 1);
  const bullPrev = prev.tenkan > prev.kijun && c[i - 1].close > clPrev.top;
  const bearPrev = prev.tenkan < prev.kijun && c[i - 1].close < clPrev.bot;
  if (bull && !bullPrev) return mk(c, i, "long", a, 0.74, "Full Ichimoku bullish alignment");
  if (bear && !bearPrev) return mk(c, i, "short", a, 0.74, "Full Ichimoku bearish alignment");
  return makeSignal({ reason: "Ichimoku not aligned" });
}
