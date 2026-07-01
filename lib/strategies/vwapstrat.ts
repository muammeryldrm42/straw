import { Candle, Signal, makeSignal, atr, sma } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

// Rolling VWAP (son N bar) ve ±σ bantları
function rollingVwap(c: Candle[], end: number, p: number) {
  let pv = 0, vol = 0;
  const tps: number[] = [], wts: number[] = [];
  for (let k = end - p + 1; k <= end; k++) { const tp = (c[k].high + c[k].low + c[k].close) / 3; pv += tp * c[k].volume; vol += c[k].volume; tps.push(tp); wts.push(c[k].volume); }
  const vwap = vol ? pv / vol : c[end].close;
  // hacim ağırlıklı std
  let varSum = 0; for (let j = 0; j < tps.length; j++) varSum += wts[j] * (tps[j] - vwap) ** 2;
  const sd = vol ? Math.sqrt(varSum / vol) : 0;
  return { vwap, sd };
}
// "Anchored" VWAP — son belirgin dip/tepeden itibaren
function anchoredVwap(c: Candle[], end: number, span = 50) {
  let anchor = end - span; if (anchor < 0) anchor = 0;
  // span içindeki en düşük low'u anchor al
  let lowIdx = anchor; for (let k = anchor; k <= end; k++) if (c[k].low < c[lowIdx].low) lowIdx = k;
  let pv = 0, vol = 0; for (let k = lowIdx; k <= end; k++) { const tp = (c[k].high + c[k].low + c[k].close) / 3; pv += tp * c[k].volume; vol += c[k].volume; }
  return vol ? pv / vol : c[end].close;
}

// 1. VWAP reversion (band bounce)
export function vwapReversion(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap, sd } = rollingVwap(c, i, 30);
  if (c[i].low <= vwap - 2 * sd && c[i].close > c[i].open) return mk(c, i, "long", a, 0.71, "VWAP -2σ band reversion (long)");
  if (c[i].high >= vwap + 2 * sd && c[i].close < c[i].open) return mk(c, i, "short", a, 0.71, "VWAP +2σ band reversion (short)");
  return makeSignal({ reason: "Inside VWAP bands" });
}
// 2. VWAP breakout
export function vwapBreakout(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap } = rollingVwap(c, i, 30), prev = rollingVwap(c, i - 1, 30);
  if (c[i - 1].close <= prev.vwap && c[i].close > vwap) return mk(c, i, "long", a, 0.7, "Reclaimed VWAP (bullish)");
  if (c[i - 1].close >= prev.vwap && c[i].close < vwap) return mk(c, i, "short", a, 0.7, "Lost VWAP (bearish)");
  return makeSignal({ reason: "No VWAP cross" });
}
// 3. VWAP trend (price holding above/below)
export function vwapTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap } = rollingVwap(c, i, 30);
  const above = c.slice(i - 4, i + 1).every((x) => x.close > vwap);
  const below = c.slice(i - 4, i + 1).every((x) => x.close < vwap);
  const prevAbove = c.slice(i - 5, i).every((x) => x.close > rollingVwap(c, i - 1, 30).vwap);
  if (above && !prevAbove) return mk(c, i, "long", a, 0.68, "Trend established above VWAP");
  if (below && prevAbove) return mk(c, i, "short", a, 0.68, "Trend established below VWAP");
  return makeSignal({ reason: "No VWAP trend shift" });
}
// 4. Anchored VWAP bounce
export function anchoredVwapBounce(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), av = anchoredVwap(c, i);
  if (c[i].low <= av && c[i].close > av && c[i].close > c[i].open) return mk(c, i, "long", a, 0.7, "Bounce off anchored VWAP");
  if (c[i].high >= av && c[i].close < av && c[i].close < c[i].open) return mk(c, i, "short", a, 0.7, "Rejection at anchored VWAP");
  return makeSignal({ reason: "No anchored-VWAP reaction" });
}
// 5. VWAP + 1σ first band
export function vwapFirstBand(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap, sd } = rollingVwap(c, i, 30);
  if (c[i - 1].close < vwap && c[i].close > vwap + sd) return mk(c, i, "long", a, 0.68, "Pushed through VWAP +1σ (momentum)");
  if (c[i - 1].close > vwap && c[i].close < vwap - sd) return mk(c, i, "short", a, 0.68, "Pushed through VWAP -1σ (momentum)");
  return makeSignal({ reason: "Within first VWAP band" });
}
// 6. VWAP mean magnet (far from VWAP → revert)
export function vwapMagnet(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap, sd } = rollingVwap(c, i, 30);
  if (c[i].close < vwap - 2.5 * sd) return mk(c, i, "long", a, 0.69, "Far below VWAP — reversion magnet", 1.5);
  if (c[i].close > vwap + 2.5 * sd) return mk(c, i, "short", a, 0.69, "Far above VWAP — reversion magnet", 1.5);
  return makeSignal({ reason: "Near VWAP" });
}
// 7. Double VWAP (short vs long period cross)
export function doubleVwap(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const fast = rollingVwap(c, i, 20).vwap, slow = rollingVwap(c, i, 50).vwap;
  const fastP = rollingVwap(c, i - 1, 20).vwap, slowP = rollingVwap(c, i - 1, 50).vwap;
  if (fastP <= slowP && fast > slow) return mk(c, i, "long", a, 0.69, "Fast VWAP crossed above slow VWAP");
  if (fastP >= slowP && fast < slow) return mk(c, i, "short", a, 0.69, "Fast VWAP crossed below slow VWAP");
  return makeSignal({ reason: "No double-VWAP cross" });
}
// 8. VWAP volume confirmation
export function vwapVolumeConfirm(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), { vwap } = rollingVwap(c, i, 30);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  if (c[i].close > vwap && c[i - 1].close <= rollingVwap(c, i - 1, 30).vwap && c[i].volume > avgV * 1.4) return mk(c, i, "long", a, 0.71, "VWAP reclaim on high volume");
  if (c[i].close < vwap && c[i - 1].close >= rollingVwap(c, i - 1, 30).vwap && c[i].volume > avgV * 1.4) return mk(c, i, "short", a, 0.71, "VWAP loss on high volume");
  return makeSignal({ reason: "No volume-confirmed VWAP cross" });
}
