import { Candle, Signal, makeSignal, atr } from "../indicators";

const mkP = (c: Candle[], i: number, side: "long" | "short", sl: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - sl <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && sl - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: sl, take_profit: tps, confidence: conf, reason });
};

// Önceki "günü" temsil eden son N mumun H/L/C'si (rolling, intraday yaklaşımı)
function prevHLC(c: Candle[], window = 24) {
  const w = c.slice(-window - 1, -1);
  return { high: Math.max(...w.map((x) => x.high)), low: Math.min(...w.map((x) => x.low)), close: w[w.length - 1].close };
}

// 1. Classic Pivot Points
export function classicPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3;
  const r1 = 2 * pp - low, s1 = 2 * pp - high, r2 = pp + (high - low), s2 = pp - (high - low);
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  if (cur.close > pp && prev.close <= pp) return mkP(c, i, "long", s1, [r1, r2], 0.69, "Crossed above classic pivot");
  if (cur.close < pp && prev.close >= pp) return mkP(c, i, "short", r1, [s1, s2], 0.69, "Crossed below classic pivot");
  return makeSignal({ reason: "At classic pivot" });
}

// 2. Camarilla Pivots
export function camarilla(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), rng = high - low;
  const h3 = close + rng * 1.1 / 4, l3 = close - rng * 1.1 / 4, h4 = close + rng * 1.1 / 2, l4 = close - rng * 1.1 / 2;
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  // H3 kırılımı = long breakout, L3 = short
  if (cur.close > h3 && prev.close <= h3) return mkP(c, i, "long", close, [h4, h4 + rng * 0.2], 0.7, "Camarilla H3 breakout");
  if (cur.close < l3 && prev.close >= l3) return mkP(c, i, "short", close, [l4, l4 - rng * 0.2], 0.7, "Camarilla L3 breakdown");
  return makeSignal({ reason: "Between Camarilla levels" });
}

// 3. Woodie Pivots
export function woodie(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low } = prevHLC(c), i = c.length - 1, cur = c[i], prev = c[i - 1];
  const pp = (high + low + 2 * cur.open) / 4;
  const r1 = 2 * pp - low, s1 = 2 * pp - high;
  if (cur.close > pp && prev.close <= pp) return mkP(c, i, "long", s1, [r1, r1 + (high - low)], 0.68, "Woodie pivot bullish");
  if (cur.close < pp && prev.close >= pp) return mkP(c, i, "short", r1, [s1, s1 - (high - low)], 0.68, "Woodie pivot bearish");
  return makeSignal({ reason: "At Woodie pivot" });
}

// 4. Fibonacci Pivots
export function fibPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3, rng = high - low;
  const r1 = pp + 0.382 * rng, s1 = pp - 0.382 * rng, r2 = pp + 0.618 * rng, s2 = pp - 0.618 * rng;
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  if (cur.close > r1 && prev.close <= r1) return mkP(c, i, "long", pp, [r2, pp + rng], 0.69, "Fib pivot R1 breakout");
  if (cur.close < s1 && prev.close >= s1) return mkP(c, i, "short", pp, [s2, pp - rng], 0.69, "Fib pivot S1 breakdown");
  return makeSignal({ reason: "Between fib pivots" });
}

// 5. DeMark Pivots
export function demarkPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  const { high, low, close } = prevHLC(c);
  let x: number;
  if (close < cur.open) x = high + 2 * low + close;
  else if (close > cur.open) x = 2 * high + low + close;
  else x = high + low + 2 * close;
  const pp = x / 4, r1 = x / 2 - low, s1 = x / 2 - high;
  if (cur.close > r1 && prev.close <= r1) return mkP(c, i, "long", pp, [r1 + (high - low) * 0.5], 0.68, "DeMark R1 breakout");
  if (cur.close < s1 && prev.close >= s1) return mkP(c, i, "short", pp, [s1 - (high - low) * 0.5], 0.68, "DeMark S1 breakdown");
  return makeSignal({ reason: "Between DeMark levels" });
}

// 6. Central Pivot Range (CPR)
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

// 7. Floor Pivot Bounce (S1/R1 mean reversion)
export function floorPivotBounce(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3;
  const r1 = 2 * pp - low, s1 = 2 * pp - high, a = atr(c, 14), i = c.length - 1, cur = c[i];
  // S1'e değip dönüş = long, R1'e değip dönüş = short
  if (Math.abs(cur.low - s1) < a[i] * 0.5 && cur.close > cur.open) return mkP(c, i, "long", s1 - a[i], [pp, r1], 0.68, "Bounce off S1 pivot");
  if (Math.abs(cur.high - r1) < a[i] * 0.5 && cur.close < cur.open) return mkP(c, i, "short", r1 + a[i], [pp, s1], 0.68, "Rejection at R1 pivot");
  return makeSignal({ reason: "Not at floor pivot" });
}

// 8. Pivot Breakout (R2/S2 strong momentum)
export function pivotBreakout(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3, rng = high - low;
  const r2 = pp + rng, s2 = pp - rng, i = c.length - 1, cur = c[i], prev = c[i - 1];
  const vol = c.map((x) => x.volume), avgV = vol.slice(-20).reduce((a, b) => a + b, 0) / 20;
  if (cur.close > r2 && prev.close <= r2 && cur.volume > avgV * 1.3) return mkP(c, i, "long", pp, [r2 + rng * 0.5, r2 + rng], 0.71, "Strong breakout above R2 + volume");
  if (cur.close < s2 && prev.close >= s2 && cur.volume > avgV * 1.3) return mkP(c, i, "short", pp, [s2 - rng * 0.5, s2 - rng], 0.71, "Strong breakdown below S2 + volume");
  return makeSignal({ reason: "Inside R2/S2" });
}
