import { Candle, Signal, makeSignal, atr, sma } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

const range = (c: Candle[], s: number, e: number) => {
  const w = c.slice(s, e + 1);
  return { hi: Math.max(...w.map((x) => x.high)), lo: Math.min(...w.map((x) => x.low)) };
};

// 1. Spring (false break below range low, then reclaim)
export function spring(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (c[i].low < lo && c[i].close > lo && c[i].close > c[i].open) return mk(c, i, "long", c[i].low - a[i] * 0.5, [(lo + hi) / 2, hi], 0.73, "Wyckoff Spring (false break below support, reclaimed)");
  return makeSignal({ reason: "No spring" });
}

// 2. Upthrust (false break above range high, then reject)
export function upthrust(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 25, i - 1);
  if (c[i].high > hi && c[i].close < hi && c[i].close < c[i].open) return mk(c, i, "short", c[i].high + a[i] * 0.5, [(lo + hi) / 2, lo], 0.73, "Wyckoff Upthrust (false break above resistance, rejected)");
  return makeSignal({ reason: "No upthrust" });
}

// 3. Sign of Strength (strong rally out of range on volume)
export function signOfStrength(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { hi } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (c[i].close > hi && c[i].close > c[i].open && (c[i].close - c[i].open) > a[i] && c[i].volume > avgV * 1.5) return mk(c, i, "long", hi - a[i], [c[i].close + a[i] * 2, c[i].close + a[i] * 4], 0.72, "Sign of Strength (range break + volume surge)");
  return makeSignal({ reason: "No SOS" });
}

// 4. Sign of Weakness
export function signOfWeakness(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (c[i].close < lo && c[i].close < c[i].open && (c[i].open - c[i].close) > a[i] && c[i].volume > avgV * 1.5) return mk(c, i, "short", lo + a[i], [c[i].close - a[i] * 2, c[i].close - a[i] * 4], 0.72, "Sign of Weakness (range breakdown + volume)");
  return makeSignal({ reason: "No SOW" });
}

// 5. Accumulation breakout (long base then markup)
export function accumulation(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 30, i - 1);
  const tight = (hi - lo) < a[i] * 6; // dar konsolidasyon = birikim
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (tight && c[i].close > hi && c[i].volume > avgV * 1.3) return mk(c, i, "long", lo, [c[i].close + (hi - lo), c[i].close + (hi - lo) * 2], 0.71, "Accumulation range breakout (markup phase)");
  return makeSignal({ reason: "No accumulation breakout" });
}

// 6. Distribution breakdown
export function distribution(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 30, i - 1);
  const tight = (hi - lo) < a[i] * 6;
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (tight && c[i].close < lo && c[i].volume > avgV * 1.3) return mk(c, i, "short", hi, [c[i].close - (hi - lo), c[i].close - (hi - lo) * 2], 0.71, "Distribution range breakdown (markdown phase)");
  return makeSignal({ reason: "No distribution breakdown" });
}

// 7. Secondary Test (retest of spring low on lower volume)
export function secondaryTest(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { lo, hi } = range(c, i - 25, i - 1);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  // Destek bölgesini düşük hacimle test edip tutması = ikincil test
  if (Math.abs(c[i].low - lo) < a[i] * 0.6 && c[i].low >= lo - a[i] * 0.3 && c[i].volume < avgV * 0.8 && c[i].close > c[i].open) return mk(c, i, "long", lo - a[i], [(lo + hi) / 2, hi], 0.7, "Secondary Test (low-volume support retest)");
  if (Math.abs(c[i].high - hi) < a[i] * 0.6 && c[i].high <= hi + a[i] * 0.3 && c[i].volume < avgV * 0.8 && c[i].close < c[i].open) return mk(c, i, "short", hi + a[i], [(lo + hi) / 2, lo], 0.7, "Secondary Test (low-volume resistance retest)");
  return makeSignal({ reason: "No secondary test" });
}

// 8. Jump Across the Creek (breakout above resistance + backup)
export function jumpAcrossCreek(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { hi, lo } = range(c, i - 30, i - 2);
  // Önceki bar dirençi kırdı, bu bar geri test edip tutuyor (backup to the creek)
  const brokeRecently = c.slice(i - 4, i).some((x) => x.close > hi);
  if (brokeRecently && c[i].low <= hi + a[i] && c[i].close > hi && c[i].close > c[i].open) return mk(c, i, "long", hi - a[i] * 1.5, [c[i].close + (hi - lo) * 0.5, c[i].close + (hi - lo)], 0.71, "Jump Across the Creek (breakout + backup hold)");
  return makeSignal({ reason: "No creek jump" });
}
