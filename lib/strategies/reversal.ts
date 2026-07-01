import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkR = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

// 1. Three Inside Up/Down (harami + confirmation)
export function threeInsideUp(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  const bullHarami = red(c1) && green(c2) && c2.close < c1.open && c2.open > c1.close;
  if (bullHarami && green(c3) && c3.close > c1.open) return mkR(c, i, "long", c1.low - 0.3 * a[i], 0.72, "Three Inside Up confirmed");
  const bearHarami = green(c1) && red(c2) && c2.close > c1.open && c2.open < c1.close;
  if (bearHarami && red(c3) && c3.close < c1.open) return mkR(c, i, "short", c1.high + 0.3 * a[i], 0.72, "Three Inside Down confirmed");
  return makeSignal({ reason: "No three-inside pattern" });
}

// 2. Three Outside Up/Down (engulfing + confirmation)
export function threeOutsideUp(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  const bullEngulf = red(c1) && green(c2) && c2.close > c1.open && c2.open < c1.close;
  if (bullEngulf && green(c3) && c3.close > c2.close) return mkR(c, i, "long", c2.low - 0.3 * a[i], 0.73, "Three Outside Up confirmed");
  const bearEngulf = green(c1) && red(c2) && c2.close < c1.open && c2.open > c1.close;
  if (bearEngulf && red(c3) && c3.close < c2.close) return mkR(c, i, "short", c2.high + 0.3 * a[i], 0.73, "Three Outside Down confirmed");
  return makeSignal({ reason: "No three-outside pattern" });
}

// 3. Abandoned Baby (gap doji gap)
export function abandonedBaby(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  const isDoji = body(c2) < rng(c2) * 0.1;
  // Bullish: kırmızı + gap-down doji + gap-up yeşil
  if (red(c1) && isDoji && c2.high < c1.low && green(c3) && c3.low > c2.high) return mkR(c, i, "long", c2.low - 0.3 * a[i], 0.71, "Bullish abandoned baby");
  if (green(c1) && isDoji && c2.low > c1.high && red(c3) && c3.high < c2.low) return mkR(c, i, "short", c2.high + 0.3 * a[i], 0.71, "Bearish abandoned baby");
  return makeSignal({ reason: "No abandoned baby" });
}

// 4. Belt Hold (opening marubozu reversal)
export function beltHold(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const closes = c.map((x) => x.close), r = rsi(closes, 14);
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  // Bullish belt: açılış = low (fitilsiz alt), uzun yeşil gövde, oversold
  if (green(cur) && lowerWick < rng(cur) * 0.05 && body(cur) > a[i] && r[i] < 40) return mkR(c, i, "long", cur.low - 0.3 * a[i], 0.69, "Bullish belt hold at oversold");
  if (red(cur) && upperWick < rng(cur) * 0.05 && body(cur) > a[i] && r[i] > 60) return mkR(c, i, "short", cur.high + 0.3 * a[i], 0.69, "Bearish belt hold at overbought");
  return makeSignal({ reason: "No belt hold" });
}

// 5. Kicking (gap marubozu reversal)
export function kicking(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  const prevMaru = body(prev) > rng(prev) * 0.9, curMaru = body(cur) > rng(cur) * 0.9;
  if (prevMaru && curMaru && red(prev) && green(cur) && cur.open > prev.open) return mkR(c, i, "long", cur.low - 0.3 * a[i], 0.72, "Bullish kicking (gap-up marubozu)");
  if (prevMaru && curMaru && green(prev) && red(cur) && cur.open < prev.open) return mkR(c, i, "short", cur.high + 0.3 * a[i], 0.72, "Bearish kicking (gap-down marubozu)");
  return makeSignal({ reason: "No kicking pattern" });
}

// 6. Matching Low (support)
export function matchingLow(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  const closes = c.map((x) => x.close), r = rsi(closes, 14);
  // İki kırmızı mum aynı close (destek), oversold
  if (red(prev) && red(cur) && Math.abs(prev.close - cur.close) / cur.close < 0.003 && r[i] < 40) return mkR(c, i, "long", cur.low - 0.5 * a[i], 0.68, "Matching low (support confirmed)");
  return makeSignal({ reason: "No matching low" });
}

// 7. Stick Sandwich
export function stickSandwich(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  // Bullish: kırmızı, yeşil, kırmızı - c1 ve c3 close eşit
  if (red(c1) && green(c2) && red(c3) && Math.abs(c1.close - c3.close) / c3.close < 0.004) return mkR(c, i, "long", Math.min(c1.low, c3.low) - 0.5 * a[i], 0.67, "Bullish stick sandwich");
  if (green(c1) && red(c2) && green(c3) && Math.abs(c1.close - c3.close) / c3.close < 0.004) return mkR(c, i, "short", Math.max(c1.high, c3.high) + 0.5 * a[i], 0.67, "Bearish stick sandwich");
  return makeSignal({ reason: "No stick sandwich" });
}

// 8. Hikkake (false breakout trap)
export function hikkake(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), inside = c[i - 2], bar = c[i - 1], cur = c[i];
  // inside bar, sonra aşağı sahte kırılım, sonra yukarı dönüş = bullish hikkake
  const wasInside = inside.high < c[i - 3]?.high && inside.low > c[i - 3]?.low;
  if (wasInside && bar.low < inside.low && cur.close > inside.high) return mkR(c, i, "long", bar.low - 0.3 * a[i], 0.7, "Bullish hikkake (failed breakdown)");
  if (wasInside && bar.high > inside.high && cur.close < inside.low) return mkR(c, i, "short", bar.high + 0.3 * a[i], 0.7, "Bearish hikkake (failed breakout)");
  return makeSignal({ reason: "No hikkake" });
}

// 9. Island Reversal (gap both sides)
export function islandReversal(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), before = c[i - 2], island = c[i - 1], cur = c[i];
  // Bottom island: gap-down sonra gap-up = long
  if (island.high < before.low && cur.low > island.high) return mkR(c, i, "long", island.low - 0.3 * a[i], 0.71, "Island bottom reversal");
  if (island.low > before.high && cur.high < island.low) return mkR(c, i, "short", island.high + 0.3 * a[i], 0.71, "Island top reversal");
  return makeSignal({ reason: "No island reversal" });
}

// 10. Counterattack Line
export function counterattack(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  // Bullish: büyük kırmızı + yeşil aynı close'a kapanır (counterattack)
  if (red(prev) && body(prev) > a[i] && green(cur) && Math.abs(cur.close - prev.close) / prev.close < 0.004 && cur.open < prev.close) return mkR(c, i, "long", cur.low - 0.4 * a[i], 0.67, "Bullish counterattack line");
  if (green(prev) && body(prev) > a[i] && red(cur) && Math.abs(cur.close - prev.close) / prev.close < 0.004 && cur.open > prev.close) return mkR(c, i, "short", cur.high + 0.4 * a[i], 0.67, "Bearish counterattack line");
  return makeSignal({ reason: "No counterattack" });
}

// 11. Ladder Bottom
export function ladderBottom(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // 3 ardışık alçalan kırmızı, sonra üst fitilli kırmızı, sonra güçlü yeşil
  const r1 = c[i - 4], r2 = c[i - 3], r3 = c[i - 2], r4 = c[i - 1], g = c[i];
  if (red(r1) && red(r2) && red(r3) && r3.close < r2.close && r2.close < r1.close &&
      red(r4) && (r4.high - Math.max(r4.open, r4.close)) > body(r4) && green(g) && g.close > r4.open)
    return mkR(c, i, "long", r3.low - 0.4 * a[i], 0.69, "Ladder bottom reversal");
  return makeSignal({ reason: "No ladder bottom" });
}

// 12. Rising/Falling Three Methods (continuation)
export function risingThreeMethods(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const c1 = c[i - 4], small = c.slice(i - 3, i), c5 = c[i];
  // Rising: büyük yeşil, 3 küçük (gövde içinde), büyük yeşil yeni high
  if (green(c1) && body(c1) > a[i] && small.every((x) => body(x) < body(c1) && x.high < c1.high && x.low > c1.low) &&
      green(c5) && c5.close > c1.close) return mkR(c, i, "long", c1.low - 0.3 * a[i], 0.7, "Rising three methods (bullish continuation)");
  if (red(c1) && body(c1) > a[i] && small.every((x) => body(x) < body(c1) && x.high < c1.high && x.low > c1.low) &&
      red(c5) && c5.close < c1.close) return mkR(c, i, "short", c1.high + 0.3 * a[i], 0.7, "Falling three methods (bearish continuation)");
  return makeSignal({ reason: "No three methods" });
}
