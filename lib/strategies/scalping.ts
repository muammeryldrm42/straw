import { Candle, Signal, makeSignal, rsi, atr, sma } from "../indicators";

// 1. Quick Scalp RSI - kısa vadeli RSI extreme bounce
export function quickScalp(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 7); // hızlı RSI
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const a = atr(c, 14);
  // Aşırı satım bounce - hızlı long
  if (rs[i - 1] < 20 && rs[i] > rs[i - 1] && cur.close > cur.open) {
    const sl = Math.min(prev.low, cur.low) - 0.2 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.5, cur.close + r * 2.2], confidence: 0.65, reason: `Scalp: RSI7 ${rs[i].toFixed(0)} bounce` });
  }
  // Aşırı alım rejection - hızlı short
  if (rs[i - 1] > 80 && rs[i] < rs[i - 1] && cur.close < cur.open) {
    const sl = Math.max(prev.high, cur.high) + 0.2 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.5, cur.close - r * 2.2], confidence: 0.65, reason: `Scalp: RSI7 ${rs[i].toFixed(0)} rejection` });
  }
  return makeSignal({ reason: "No scalp setup" });
}

// 2. Range Bounce - dar range içinde destek/direnç bounce
export function rangeBounce(c: Candle[]): Signal {
  if (c.length < 35) return makeSignal({ reason: "Insufficient data" });
  const rng = c.slice(-30);
  const rH = Math.max(...rng.map((x) => x.high)), rL = Math.min(...rng.map((x) => x.low));
  const size = rH - rL;
  const a = atr(c, 14), ai = a.length - 1;
  // Dar range olmalı (ATR'nin 6 katından az)
  if (size / a[ai] > 6) return makeSignal({ reason: "Range too wide (trend exists)" });
  const cur = c[c.length - 1], prev = c[c.length - 2];
  const tol = size * 0.1;
  // Alt sınırdan bounce - long
  if (cur.low <= rL + tol && cur.close > cur.open && prev.low <= rL + tol * 2) {
    const sl = rL - 0.5 * a[ai], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [(rH + rL) / 2, rH - tol], confidence: 0.68, reason: `Range lower bounce @ ${rL.toFixed(2)}` });
  }
  // Üst sınırdan rejection - short
  if (cur.high >= rH - tol && cur.close < cur.open && prev.high >= rH - tol * 2) {
    const sl = rH + 0.5 * a[ai], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [(rH + rL) / 2, rL + tol], confidence: 0.68, reason: `Range upper rejection @ ${rH.toFixed(2)}` });
  }
  return makeSignal({ reason: "Not at range edge" });
}

// 3. Momentum Burst - tek mumda ATR×2+ hareket + hacim spike (intraday breakout)
export function momentumBurst(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const move = Math.abs(cur.close - cur.open);
  if (move < a[i] * 2) return makeSignal({ reason: "Insufficient momentum" });
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  if (cur.volume < avgV * 1.5) return makeSignal({ reason: "Volume not confirmed" });
  // Yön: yeşil mum = long, kırmızı = short
  if (cur.close > cur.open) {
    const sl = cur.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.8, cur.close + r * 3], confidence: 0.72, reason: `Momentum burst up (${(move/a[i]).toFixed(1)}x ATR)` });
  } else {
    const sl = cur.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.8, cur.close - r * 3], confidence: 0.72, reason: `Momentum burst down (${(move/a[i]).toFixed(1)}x ATR)` });
  }
}
