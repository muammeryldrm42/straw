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

export function fullIchimoku(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), cl = cloud(c, i);
  const chikouOk = (dir: number) => dir > 0 ? c[i].close > c[i - 26].close : c[i].close < c[i - 26].close;
  let score = 0;
  score += now.tenkan > now.kijun ? 1 : -1;
  score += c[i].close > cl.top ? 1 : (c[i].close < cl.bot ? -1 : 0);
  score += now.spanA > now.spanB ? 1 : -1;
  score += c[i].close > now.kijun ? 1 : -1;
  score += chikouOk(1) ? 1 : (chikouOk(-1) ? -1 : 0);
  if (score >= 4) return mk(c, i, "long", a, 0.73, `Ichimoku full bullish confluence (${score}/5)`);
  if (score <= -4) return mk(c, i, "short", a, 0.73, `Ichimoku full bearish confluence (${score}/5)`);
  return makeSignal({ reason: `Ichimoku score ${score}` });
}
