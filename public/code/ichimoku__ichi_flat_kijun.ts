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

export function flatKijun(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const k = [ichi(c, i).kijun, ichi(c, i - 1).kijun, ichi(c, i - 2).kijun, ichi(c, i - 3).kijun];
  const flat = Math.max(...k) - Math.min(...k) < a[i] * 0.3; // düz kijun
  const now = ichi(c, i);
  // Düz kijun mıknatıs gibi çeker — fiyat uzaktaysa kijun'a doğru
  if (flat && c[i].close < now.kijun - a[i] && c[i].close > c[i].open) return mk(c, i, "long", a, 0.67, "Flat Kijun magnet pull up");
  if (flat && c[i].close > now.kijun + a[i] && c[i].close < c[i].open) return mk(c, i, "short", a, 0.67, "Flat Kijun magnet pull down");
  return makeSignal({ reason: "No flat-Kijun setup" });
}
