import { Candle, Signal, makeSignal, atr, ema } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

// Son swing aralığı (en yüksek high & en düşük low, yönüyle)
function swing(c: Candle[], end: number, span = 50) {
  const w = c.slice(end - span + 1, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < w.length; k++) { if (w[k].high > w[hiIdx].high) hiIdx = k; if (w[k].low < w[loIdx].low) loIdx = k; }
  const hi = w[hiIdx].high, lo = w[loIdx].low;
  const up = hiIdx > loIdx; // son hareket yukarı mı (high low'dan sonra geldi)
  return { hi, lo, up, range: hi - lo };
}

// 1. Fib retracement bounce (0.618)
export function fibRetracement(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { // yükselen swing'de geri çekilme = long fırsatı
    const f618 = s.hi - s.range * 0.618, f50 = s.hi - s.range * 0.5;
    if (c[i].low <= f50 && c[i].low >= f618 - a[i] && c[i].close > c[i].open) return mk(c, i, "long", f618 - a[i], [c[i].close + s.range * 0.3, s.hi], 0.71, "Fib 0.5–0.618 retracement bounce (uptrend)");
  } else {
    const f618 = s.lo + s.range * 0.618, f50 = s.lo + s.range * 0.5;
    if (c[i].high >= f50 && c[i].high <= f618 + a[i] && c[i].close < c[i].open) return mk(c, i, "short", f618 + a[i], [c[i].close - s.range * 0.3, s.lo], 0.71, "Fib 0.5–0.618 retracement rejection (downtrend)");
  }
  return makeSignal({ reason: "Not at fib retracement" });
}

// 2. Golden Pocket (0.618–0.65)
export function goldenPocket(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) {
    const gpTop = s.hi - s.range * 0.618, gpBot = s.hi - s.range * 0.65;
    if (c[i].low <= gpTop && c[i].low >= gpBot - a[i] * 0.5 && c[i].close > c[i].open) return mk(c, i, "long", gpBot - a[i], [c[i].close + s.range * 0.4, s.hi], 0.73, "Golden pocket (0.618–0.65) long");
  } else {
    const gpBot = s.lo + s.range * 0.618, gpTop = s.lo + s.range * 0.65;
    if (c[i].high >= gpBot && c[i].high <= gpTop + a[i] * 0.5 && c[i].close < c[i].open) return mk(c, i, "short", gpTop + a[i], [c[i].close - s.range * 0.4, s.lo], 0.73, "Golden pocket (0.618–0.65) short");
  }
  return makeSignal({ reason: "Not in golden pocket" });
}

// 3. Fib 0.382 shallow pullback (strong trend)
export function fibShallow(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { const f382 = s.hi - s.range * 0.382; if (Math.abs(c[i].low - f382) < a[i] && c[i].close > c[i].open) return mk(c, i, "long", f382 - a[i] * 1.5, [s.hi, s.hi + s.range * 0.3], 0.7, "Shallow 0.382 pullback (strong uptrend)"); }
  else { const f382 = s.lo + s.range * 0.382; if (Math.abs(c[i].high - f382) < a[i] && c[i].close < c[i].open) return mk(c, i, "short", f382 + a[i] * 1.5, [s.lo, s.lo - s.range * 0.3], 0.7, "Shallow 0.382 pullback (strong downtrend)"); }
  return makeSignal({ reason: "Not at 0.382" });
}

// 4. Fib extension target (1.618 breakout)
export function fibExtension(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up && c[i].close > s.hi && c[i - 1].close <= s.hi) return mk(c, i, "long", s.hi - a[i] * 1.5, [s.hi + s.range * 0.618, s.hi + s.range], 0.7, "Breakout to 1.618 fib extension (up)");
  if (!s.up && c[i].close < s.lo && c[i - 1].close >= s.lo) return mk(c, i, "short", s.lo + a[i] * 1.5, [s.lo - s.range * 0.618, s.lo - s.range], 0.7, "Breakdown to 1.618 fib extension (down)");
  return makeSignal({ reason: "No extension breakout" });
}

// 5. Fib confluence (fib + EMA)
export function fibConfluence(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i), e = ema(c.map((x) => x.close), 50);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { const f618 = s.hi - s.range * 0.618; if (Math.abs(f618 - e[i]) < a[i] * 1.5 && c[i].low <= f618 + a[i] && c[i].close > c[i].open) return mk(c, i, "long", f618 - a[i] * 1.5, [c[i].close + s.range * 0.3, s.hi], 0.74, "Fib 0.618 + EMA50 confluence (long)"); }
  else { const f618 = s.lo + s.range * 0.618; if (Math.abs(f618 - e[i]) < a[i] * 1.5 && c[i].high >= f618 - a[i] && c[i].close < c[i].open) return mk(c, i, "short", f618 + a[i] * 1.5, [c[i].close - s.range * 0.3, s.lo], 0.74, "Fib 0.618 + EMA50 confluence (short)"); }
  return makeSignal({ reason: "No fib+EMA confluence" });
}

// 6. Fib 0.786 deep retracement
export function fibDeep(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { const f786 = s.hi - s.range * 0.786; if (c[i].low <= f786 + a[i] && c[i].low >= s.lo && c[i].close > c[i].open) return mk(c, i, "long", s.lo - a[i], [s.hi - s.range * 0.382, s.hi], 0.69, "Deep 0.786 retracement (last-chance long)"); }
  else { const f786 = s.lo + s.range * 0.786; if (c[i].high >= f786 - a[i] && c[i].high <= s.hi && c[i].close < c[i].open) return mk(c, i, "short", s.hi + a[i], [s.lo + s.range * 0.382, s.lo], 0.69, "Deep 0.786 retracement (last-chance short)"); }
  return makeSignal({ reason: "Not at 0.786" });
}

// 7. Fib breakout retest (broke 0.5, retest as support)
export function fibBreakoutRetest(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  const mid = s.lo + s.range * 0.5;
  if (c[i].close > mid && c[i].low <= mid + a[i] && c.slice(i - 5, i).some((x) => x.close > mid) && c[i].close > c[i].open) return mk(c, i, "long", mid - a[i] * 1.5, [s.hi, s.hi + s.range * 0.3], 0.68, "Fib 0.5 broken & retested as support");
  if (c[i].close < mid && c[i].high >= mid - a[i] && c.slice(i - 5, i).some((x) => x.close < mid) && c[i].close < c[i].open) return mk(c, i, "short", mid + a[i] * 1.5, [s.lo, s.lo - s.range * 0.3], 0.68, "Fib 0.5 broken & retested as resistance");
  return makeSignal({ reason: "No fib retest" });
}

// 8. Fib trend continuation (multiple touches)
export function fibTrendContinuation(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i), e = ema(c.map((x) => x.close), 21);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up && e[i] > e[i - 10]) { const f5 = s.hi - s.range * 0.5; if (c[i].low <= f5 && c[i].close > f5 && c[i].close > c[i].open) return mk(c, i, "long", f5 - a[i] * 2, [s.hi, s.hi + s.range * 0.5], 0.7, "Fib pullback in confirmed uptrend"); }
  if (!s.up && e[i] < e[i - 10]) { const f5 = s.lo + s.range * 0.5; if (c[i].high >= f5 && c[i].close < f5 && c[i].close < c[i].open) return mk(c, i, "short", f5 + a[i] * 2, [s.lo, s.lo - s.range * 0.5], 0.7, "Fib pullback in confirmed downtrend"); }
  return makeSignal({ reason: "No fib continuation" });
}

// 9. Fib reversal (rejection at 1.0 / full retrace)
export function fibFullRetrace(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  // Fiyat tüm swing'i geri aldıysa (1.0) ve dönüyorsa
  if (s.up && c[i].low <= s.lo + a[i] && c[i].close > c[i].open) return mk(c, i, "long", s.lo - a[i] * 1.5, [s.lo + s.range * 0.5, s.hi], 0.68, "Full retrace to swing low — reversal long");
  if (!s.up && c[i].high >= s.hi - a[i] && c[i].close < c[i].open) return mk(c, i, "short", s.hi + a[i] * 1.5, [s.hi - s.range * 0.5, s.lo], 0.68, "Full retrace to swing high — reversal short");
  return makeSignal({ reason: "No full retrace" });
}

// 10. Fib cluster (0.5 + 0.618 zone)
export function fibCluster(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { const top = s.hi - s.range * 0.5, bot = s.hi - s.range * 0.618; if (c[i].low <= top && c[i].low >= bot - a[i] && c[i].close > c[i].open) return mk(c, i, "long", bot - a[i] * 1.5, [c[i].close + s.range * 0.3, s.hi], 0.72, "Fib cluster 0.5–0.618 zone (long)"); }
  else { const bot = s.lo + s.range * 0.5, top = s.lo + s.range * 0.618; if (c[i].high >= bot && c[i].high <= top + a[i] && c[i].close < c[i].open) return mk(c, i, "short", top + a[i] * 1.5, [c[i].close - s.range * 0.3, s.lo], 0.72, "Fib cluster 0.5–0.618 zone (short)"); }
  return makeSignal({ reason: "Not in fib cluster" });
}
