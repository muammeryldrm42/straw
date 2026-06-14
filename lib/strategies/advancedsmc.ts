import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

// 1. Liquidity Void (imbalance gap) fill
export function liquidityVoid(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Geniş gövdeli mum sonrası boşluk: c[i-2].high < c[i].low (bullish void)
  for (let k = i - 1; k >= i - 8 && k >= 2; k--) {
    if (c[k - 2].high < c[k].low) { // bullish void
      const voidMid = (c[k - 2].high + c[k].low) / 2;
      if (c[i].low <= voidMid && c[i].close > c[i].open) return mkA(c, i, "long", c[k - 2].high - a[i], [c[i].close + (c[i].close - c[k - 2].high), c[k].high], 0.71, "Bullish liquidity void fill");
    }
    if (c[k - 2].low > c[k].high) { // bearish void
      const voidMid = (c[k - 2].low + c[k].high) / 2;
      if (c[i].high >= voidMid && c[i].close < c[i].open) return mkA(c, i, "short", c[k - 2].low + a[i], [c[i].close - (c[k - 2].low - c[i].close), c[k].low], 0.71, "Bearish liquidity void fill");
    }
  }
  return makeSignal({ reason: "No liquidity void" });
}

// 2. FVG Inversion (broken FVG flips role)
export function fvgInversion(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 2; k >= i - 10 && k >= 2; k--) {
    // bullish FVG: c[k-2].high < c[k].low
    if (c[k - 2].high < c[k].low) {
      const top = c[k].low, bot = c[k - 2].high;
      // fiyat aşağı kırıp FVG'yi geçti -> inversion -> şimdi direnç -> short retest
      const broke = c.slice(k + 1, i).some((x) => x.close < bot);
      if (broke && c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i], [c[i].close - (top - c[i].close) * 2], 0.7, "Bullish FVG inverted to resistance");
    }
    if (c[k - 2].low > c[k].high) {
      const bot = c[k].high, top = c[k - 2].low;
      const broke = c.slice(k + 1, i).some((x) => x.close > top);
      if (broke && c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i], [c[i].close + (c[i].close - bot) * 2], 0.7, "Bearish FVG inverted to support");
    }
  }
  return makeSignal({ reason: "No FVG inversion" });
}

// 3. Mitigation Block (last opposite candle before impulse)
export function mitigationBlock(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 2; k >= i - 12 && k >= 1; k--) {
    const impulse = c[k + 1].close - c[k + 1].open;
    if (c[k].close < c[k].open && impulse > a[i] * 1.2) { // bullish mitigation block (down candle before up impulse)
      const top = c[k].high, bot = c[k].low;
      if (c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i] * 0.5, [c[i].close + (top - bot) * 2, c[i].close + (top - bot) * 3], 0.71, "Bullish mitigation block retest");
    }
    if (c[k].close > c[k].open && impulse < -a[i] * 1.2) {
      const top = c[k].high, bot = c[k].low;
      if (c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i] * 0.5, [c[i].close - (top - bot) * 2, c[i].close - (top - bot) * 3], 0.71, "Bearish mitigation block retest");
    }
  }
  return makeSignal({ reason: "No mitigation block" });
}

// 4. Rejection Block (long-wick rejection zone)
export function rejectionBlock(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  const bodyS = Math.abs(cur.close - cur.open);
  if (lowerWick > bodyS * 2 && lowerWick > a[i] && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.3, [cur.close + lowerWick, cur.close + lowerWick * 2], 0.69, "Bullish rejection block (long lower wick)");
  if (upperWick > bodyS * 2 && upperWick > a[i] && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.3, [cur.close - upperWick, cur.close - upperWick * 2], 0.69, "Bearish rejection block (long upper wick)");
  return makeSignal({ reason: "No rejection block" });
}

// 5. Supply Zone retest
export function supplyZone(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Konsolidasyon sonrası güçlü düşüş = supply zone
  for (let k = i - 3; k >= i - 14 && k >= 2; k--) {
    const drop = c[k + 1].close - c[k].close;
    if (drop < -a[i] * 1.5) {
      const top = Math.max(c[k].high, c[k - 1].high), bot = Math.min(c[k].open, c[k].close);
      if (c[i].high >= bot && c[i].high <= top && c[i].close < c[i].open) return mkA(c, i, "short", top + a[i] * 0.5, [c[i].close - (top - bot) * 2, c[i].close - (top - bot) * 4], 0.71, "Supply zone retest rejection");
    }
  }
  return makeSignal({ reason: "No supply zone retest" });
}

// 6. Demand Zone retest
export function demandZone(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  for (let k = i - 3; k >= i - 14 && k >= 2; k--) {
    const rise = c[k + 1].close - c[k].close;
    if (rise > a[i] * 1.5) {
      const bot = Math.min(c[k].low, c[k - 1].low), top = Math.max(c[k].open, c[k].close);
      if (c[i].low <= top && c[i].low >= bot && c[i].close > c[i].open) return mkA(c, i, "long", bot - a[i] * 0.5, [c[i].close + (top - bot) * 2, c[i].close + (top - bot) * 4], 0.71, "Demand zone retest bounce");
    }
  }
  return makeSignal({ reason: "No demand zone retest" });
}

// 7. Session Liquidity sweep (recent high/low grab)
export function sessionLiquidity(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  // Sweep low sonra dönüş = long
  if (cur.low < lo && cur.close > lo && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.5, [cur.close + (hi - cur.close) * 0.5, hi], 0.72, "Session-low liquidity sweep + reversal");
  if (cur.high > hi && cur.close < hi && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.5, [cur.close - (cur.close - lo) * 0.5, lo], 0.72, "Session-high liquidity sweep + reversal");
  return makeSignal({ reason: "No session sweep" });
}

// 8. Daily Level reaction
export function dailyLevel(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  // Önceki 24-mum bloğunun H/L = günlük seviye
  const prevDay = c.slice(i - 48, i - 24), pdh = Math.max(...prevDay.map((x) => x.high)), pdl = Math.min(...prevDay.map((x) => x.low));
  if (Math.abs(cur.low - pdl) < a[i] * 0.6 && cur.close > cur.open) return mkA(c, i, "long", pdl - a[i] * 0.5, [cur.close + a[i] * 2, cur.close + a[i] * 4], 0.69, "Bounce off previous-day low (PDL)");
  if (Math.abs(cur.high - pdh) < a[i] * 0.6 && cur.close < cur.open) return mkA(c, i, "short", pdh + a[i] * 0.5, [cur.close - a[i] * 2, cur.close - a[i] * 4], 0.69, "Rejection at previous-day high (PDH)");
  return makeSignal({ reason: "Not at daily level" });
}

// 9. Equal Highs Cluster (liquidity pool sweep)
export function equalHighsCluster(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 4), sl = swingLows(c, 4), i = c.length - 1, a = atr(c, 14), cur = c[i];
  const highs: number[] = [], lows: number[] = [];
  for (let k = Math.max(0, i - 40); k < i; k++) { if (sh[k] !== null) highs.push(sh[k] as number); if (sl[k] !== null) lows.push(sl[k] as number); }
  // 2+ eşit high -> sweep edilirse short
  const eqHigh = highs.filter((h, idx) => highs.some((h2, j) => j !== idx && Math.abs(h - h2) / h < 0.004));
  const eqLow = lows.filter((l, idx) => lows.some((l2, j) => j !== idx && Math.abs(l - l2) / l < 0.004));
  if (eqHigh.length >= 2) { const lvl = Math.max(...eqHigh); if (cur.high > lvl && cur.close < lvl) return mkA(c, i, "short", cur.high + a[i] * 0.5, [cur.close - a[i] * 2, cur.close - a[i] * 4], 0.72, "Equal-highs liquidity swept + rejection"); }
  if (eqLow.length >= 2) { const lvl = Math.min(...eqLow); if (cur.low < lvl && cur.close > lvl) return mkA(c, i, "long", cur.low - a[i] * 0.5, [cur.close + a[i] * 2, cur.close + a[i] * 4], 0.72, "Equal-lows liquidity swept + reversal"); }
  return makeSignal({ reason: "No equal-level sweep" });
}

// 10. Order Flow Imbalance
export function orderFlowImbalance(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // 3 ardışık güçlü tek-yön mum (delta proxy: gövde/range + hacim)
  const last3 = c.slice(i - 2, i + 1);
  const allGreen = last3.every((x) => x.close > x.open && Math.abs(x.close - x.open) > (x.high - x.low) * 0.6);
  const allRed = last3.every((x) => x.close < x.open && Math.abs(x.close - x.open) > (x.high - x.low) * 0.6);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  const volRising = last3.every((x) => x.volume > avgV);
  if (allGreen && volRising) return mkA(c, i, "long", Math.min(...last3.map((x) => x.low)) - a[i] * 0.5, [c[i].close + a[i] * 2, c[i].close + a[i] * 3.5], 0.7, "Bullish order-flow imbalance (3 strong green + volume)");
  if (allRed && volRising) return mkA(c, i, "short", Math.max(...last3.map((x) => x.high)) + a[i] * 0.5, [c[i].close - a[i] * 2, c[i].close - a[i] * 3.5], 0.7, "Bearish order-flow imbalance (3 strong red + volume)");
  return makeSignal({ reason: "Balanced order flow" });
}

// 11. SMT Divergence proxy (price vs momentum extreme)
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

// 12. Turtle Soup (false breakout reversal)
export function turtleSoup(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi20 = Math.max(...win.map((x) => x.high)), lo20 = Math.min(...win.map((x) => x.low));
  // 20-bar low'un altına kırıp aynı mumda geri kapanır = turtle soup long
  if (cur.low < lo20 && cur.close > lo20 && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.5, [hi20 * 0.5 + cur.close * 0.5, hi20], 0.71, "Turtle Soup: failed 20-bar low breakout");
  if (cur.high > hi20 && cur.close < hi20 && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.5, [lo20 * 0.5 + cur.close * 0.5, lo20], 0.71, "Turtle Soup: failed 20-bar high breakout");
  return makeSignal({ reason: "No turtle soup setup" });
}
