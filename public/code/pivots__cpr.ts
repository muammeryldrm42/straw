import { Candle, Signal, makeSignal, atr } from "../indicators";

const mkP = (c: Candle[], i: number, side: "long" | "short", sl: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - sl <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && sl - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: sl, take_profit: tps, confidence: conf, reason });
};
function prevHLC(c: Candle[], window = 24) {
  const w = c.slice(-window - 1, -1);
  return { high: Math.max(...w.map((x) => x.high)), low: Math.min(...w.map((x) => x.low)), close: w[w.length - 1].close };
}

export function cpr(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3;
  const bc = (high + low) / 2, tc = 2 * pp - bc;
  const top = Math.max(tc, bc), bot = Math.min(tc, bc);
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  // CPR üstüne kırılım = bullish gün
  if (cur.close > top && prev.close <= top) return mkP(c, i, "long", bot, [top + (top - bot) * 2, top + (top - bot) * 4], 0.7, "Price broke above CPR (bullish)");
  if (cur.close < bot && prev.close >= bot) return mkP(c, i, "short", top, [bot - (top - bot) * 2, bot - (top - bot) * 4], 0.7, "Price broke below CPR (bearish)");
  return makeSignal({ reason: "Inside CPR" });
}
