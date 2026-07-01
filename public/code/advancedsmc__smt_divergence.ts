import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function smtDivergence(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), closes = c.map((x) => x.close);
  // momentum proxy
  const mom = closes.map((v, k) => (k >= 10 ? v - closes[k - 10] : 0));
  const win = c.slice(i - 20, i + 1);
  const lowestIdx = win.reduce((m, x, idx) => (x.low < win[m].low ? idx : m), 0);
  const highestIdx = win.reduce((m, x, idx) => (x.high > win[m].high ? idx : m), 0);
  // Fiyat yeni dip ama momentum daha yüksek dip = bullish div
  if (lowestIdx === win.length - 1 && mom[i] > mom[i - 10]) return mkA(c, i, "long", c[i].low - a[i], [c[i].close + a[i] * 2, c[i].close + a[i] * 4], 0.7, "Bullish SMT divergence (price low, momentum higher)");
  if (highestIdx === win.length - 1 && mom[i] < mom[i - 10]) return mkA(c, i, "short", c[i].high + a[i], [c[i].close - a[i] * 2, c[i].close - a[i] * 4], 0.7, "Bearish SMT divergence (price high, momentum lower)");
  return makeSignal({ reason: "No SMT divergence" });
}
