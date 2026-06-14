import { Candle, Signal, makeSignal, atr, ema } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkPA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

// 1. Inside Bar breakout
export function insideBar(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), mother = c[i - 2], inside = c[i - 1], cur = c[i];
  const isInside = inside.high < mother.high && inside.low > mother.low;
  if (isInside && cur.close > mother.high) return mkPA(c, i, "long", inside.low - 0.3 * a[i], 0.7, "Inside bar breakout up");
  if (isInside && cur.close < mother.low) return mkPA(c, i, "short", inside.high + 0.3 * a[i], 0.7, "Inside bar breakdown");
  return makeSignal({ reason: "No inside-bar break" });
}

// 2. Outside Bar (engulfing range) reversal
export function outsideBar(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  const isOutside = cur.high > prev.high && cur.low < prev.low;
  if (isOutside && green(cur) && cur.close > prev.high) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.71, "Bullish outside bar");
  if (isOutside && red(cur) && cur.close < prev.low) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.71, "Bearish outside bar");
  return makeSignal({ reason: "No outside bar" });
}

// 3. Fakey (inside bar false breakout)
export function fakey(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), mother = c[i - 3], inside = c[i - 2], fake = c[i - 1], cur = c[i];
  const isInside = inside.high < mother.high && inside.low > mother.low;
  // Fakey long: inside bar, aşağı sahte kırılım, sonra yukarı dönüş
  if (isInside && fake.low < mother.low && cur.close > mother.low && cur.close > cur.open) return mkPA(c, i, "long", fake.low - 0.3 * a[i], 0.71, "Bullish fakey (false breakdown)");
  if (isInside && fake.high > mother.high && cur.close < mother.high && cur.close < cur.open) return mkPA(c, i, "short", fake.high + 0.3 * a[i], 0.71, "Bearish fakey (false breakout)");
  return makeSignal({ reason: "No fakey" });
}

// 4. NR4 (narrowest range of 4) breakout
export function nr4(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1];
  const last4 = c.slice(i - 4, i);
  const isNR4 = rng(prev) === Math.min(...last4.map(rng));
  if (isNR4 && c[i].close > prev.high) return mkPA(c, i, "long", prev.low - 0.3 * a[i], 0.69, "NR4 breakout up (volatility expansion)");
  if (isNR4 && c[i].close < prev.low) return mkPA(c, i, "short", prev.high + 0.3 * a[i], 0.69, "NR4 breakdown (volatility expansion)");
  return makeSignal({ reason: "No NR4 break" });
}

// 5. NR7 (narrowest range of 7) breakout
export function nr7(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1];
  const last7 = c.slice(i - 7, i);
  const isNR7 = rng(prev) === Math.min(...last7.map(rng));
  if (isNR7 && c[i].close > prev.high) return mkPA(c, i, "long", prev.low - 0.3 * a[i], 0.71, "NR7 breakout up (strong contraction)");
  if (isNR7 && c[i].close < prev.low) return mkPA(c, i, "short", prev.high + 0.3 * a[i], 0.71, "NR7 breakdown (strong contraction)");
  return makeSignal({ reason: "No NR7 break" });
}

// 6. Wide Range Bar continuation
export function wideRangeBar(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const avgRange = c.slice(i - 10, i).reduce((s, x) => s + rng(x), 0) / 10;
  if (rng(cur) > avgRange * 2 && green(cur) && body(cur) > rng(cur) * 0.7) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.69, "Wide-range bar (bullish thrust)");
  if (rng(cur) > avgRange * 2 && red(cur) && body(cur) > rng(cur) * 0.7) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.69, "Wide-range bar (bearish thrust)");
  return makeSignal({ reason: "No wide-range bar" });
}

// 7. Pin Bar combo (with trend)
export function pinBarCombo(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i], closes = c.map((x) => x.close), e = ema(closes, 21);
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  // Bullish pin in uptrend
  if (lowerWick > body(cur) * 2 && lowerWick > rng(cur) * 0.6 && cur.close > e[i]) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.72, "Bullish pin bar in uptrend");
  if (upperWick > body(cur) * 2 && upperWick > rng(cur) * 0.6 && cur.close < e[i]) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.72, "Bearish pin bar in downtrend");
  return makeSignal({ reason: "No pin bar in trend" });
}

// 8. Two-Bar Reversal
export function twoBarReversal(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  // Güçlü kırmızı sonra güçlü yeşil aynı seviyede = reversal
  if (red(prev) && body(prev) > a[i] && green(cur) && body(cur) > a[i] && cur.close > prev.open) return mkPA(c, i, "long", Math.min(prev.low, cur.low) - 0.3 * a[i], 0.7, "Two-bar bullish reversal");
  if (green(prev) && body(prev) > a[i] && red(cur) && body(cur) > a[i] && cur.close < prev.open) return mkPA(c, i, "short", Math.max(prev.high, cur.high) + 0.3 * a[i], 0.7, "Two-bar bearish reversal");
  return makeSignal({ reason: "No two-bar reversal" });
}

// 9. Three-Bar Reversal
export function threeBarReversal(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], cur = c[i];
  // Düşen low (c2 en düşük), sonra yükselen close = bullish 3-bar
  if (c2.low < c1.low && c2.low < cur.low && cur.close > c2.high && green(cur)) return mkPA(c, i, "long", c2.low - 0.3 * a[i], 0.7, "Three-bar bullish reversal");
  if (c2.high > c1.high && c2.high > cur.high && cur.close < c2.low && red(cur)) return mkPA(c, i, "short", c2.high + 0.3 * a[i], 0.7, "Three-bar bearish reversal");
  return makeSignal({ reason: "No three-bar reversal" });
}

// 10. Springboard (pullback to support in trend)
export function springboard(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), closes = c.map((x) => x.close), e = ema(closes, 21), cur = c[i];
  // Uptrend + EMA'ya geri çekilme + dönüş mumu
  if (e[i] > e[i - 10] && cur.low <= e[i] && cur.close > e[i] && green(cur)) return mkPA(c, i, "long", cur.low - 0.5 * a[i], 0.71, "Springboard: pullback to EMA in uptrend");
  if (e[i] < e[i - 10] && cur.high >= e[i] && cur.close < e[i] && red(cur)) return mkPA(c, i, "short", cur.high + 0.5 * a[i], 0.71, "Springboard: bounce to EMA in downtrend");
  return makeSignal({ reason: "No springboard setup" });
}

// 11. Exhaustion Bar (climax + reversal)
export function exhaustionBar(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  // Yüksek hacim + uzun fitil + büyük range = exhaustion
  if (cur.volume > avgV * 2 && rng(cur) > a[i] * 1.5 && lowerWick > body(cur) && cur.close > cur.open) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.7, "Exhaustion bar (selling climax)");
  if (cur.volume > avgV * 2 && rng(cur) > a[i] * 1.5 && upperWick > body(cur) && cur.close < cur.open) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.7, "Exhaustion bar (buying climax)");
  return makeSignal({ reason: "No exhaustion bar" });
}

// 12. Trap Bar (stop-run reversal)
export function trapBar(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 10, i), recentHigh = Math.max(...win.map((x) => x.high)), recentLow = Math.min(...win.map((x) => x.low));
  // Recent low'u kırıp güçlü geri kapanış = bear trap (long)
  if (cur.low < recentLow && cur.close > recentLow && body(cur) > a[i] && green(cur)) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.71, "Bear trap (stop-run below support)");
  if (cur.high > recentHigh && cur.close < recentHigh && body(cur) > a[i] && red(cur)) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.71, "Bull trap (stop-run above resistance)");
  return makeSignal({ reason: "No trap bar" });
}
