import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slM = 2, tpM = [1.5, 2.5, 4]): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slM * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close + r * m), confidence: conf, reason }); }
  const sl = cur.close + slM * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: tpM.map((m) => cur.close - r * m), confidence: conf, reason });
};

// Demo notu: bot stratejileri normalde çok kademeli emir yönetir; burada tek-giriş sinyali olarak modellendi.

// 1. Grid Trading (range grid mean reversion)
export function gridTrading(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), win = c.slice(i - 30, i);
  const hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  const range = hi - lo, levels = 5, step = range / levels, cur = c[i];
  // Alt gridlere değince long (range içinde mean reversion)
  const lowerGrid = lo + step, upperGrid = hi - step;
  if (cur.low <= lowerGrid && cur.close > lowerGrid && range / lo < 0.4) return mk(c, i, "long", a, 0.69, `Grid buy @ lower band (range ${lo.toFixed(2)}-${hi.toFixed(2)})`, 2, [1, 2, 3]);
  if (cur.high >= upperGrid && cur.close < upperGrid && range / lo < 0.4) return mk(c, i, "short", a, 0.69, `Grid sell @ upper band`, 2, [1, 2, 3]);
  return makeSignal({ reason: "Price mid-grid (no fill)" });
}

// 2. DCA (Dollar-Cost Averaging — buy dips in uptrend)
export function dca(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const trend = sma(closes, 50), r = rsi(closes, 14);
  // Genel yükseliş + pullback (RSI < 45) = DCA giriş noktası
  if (closes[i] > trend[i] && r[i] < 45 && closes[i] < closes[i - 3]) return mk(c, i, "long", a, 0.7, "DCA buy: dip within uptrend", 3, [1.5, 3, 5]);
  return makeSignal({ reason: "No DCA entry (not a dip in uptrend)" });
}

// 3. Martingale (add after adverse move — modeled as entry after sharp drop)
export function martingale(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14), r = rsi(closes, 14);
  const drop3 = (closes[i] - closes[i - 3]) / closes[i - 3];
  // Keskin düşüş + aşırı satım = martingale ekleme (büyük boyut notu)
  if (drop3 < -0.04 && r[i] < 30) return mk(c, i, "long", a, 0.66, "Martingale add after sharp drop (size up — high risk)", 3, [1, 2, 3.5]);
  return makeSignal({ reason: "No martingale trigger" });
}

// 4. Anti-Martingale (pyramiding into strength)
export function antiMartingale(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14), e = ema(closes, 21);
  const up3 = closes[i] > closes[i - 1] && closes[i - 1] > closes[i - 2] && closes[i - 2] > closes[i - 3];
  // Trend yönünde 3 ardışık yükseliş + EMA üstü = piramitleme
  if (closes[i] > e[i] && up3 && e[i] > e[i - 3]) return mk(c, i, "long", a, 0.7, "Anti-Martingale: pyramid into uptrend strength", 2, [1.5, 3, 5]);
  const dn3 = closes[i] < closes[i - 1] && closes[i - 1] < closes[i - 2] && closes[i - 2] < closes[i - 3];
  if (closes[i] < e[i] && dn3 && e[i] < e[i - 3]) return mk(c, i, "short", a, 0.7, "Anti-Martingale: pyramid into downtrend strength", 2, [1.5, 3, 5]);
  return makeSignal({ reason: "No pyramiding trigger" });
}

// 5. Trailing Stop bot (ATR chandelier entry)
export function trailingStop(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 22);
  const highest = Math.max(...c.slice(i - 22, i + 1).map((x) => x.high));
  const lowest = Math.min(...c.slice(i - 22, i + 1).map((x) => x.low));
  const longStop = highest - a[i] * 3, shortStop = lowest + a[i] * 3;
  // Fiyat trailing stop'u koruyor + yükseliyor = trend takip girişi
  if (closes[i] > longStop && closes[i - 1] <= (Math.max(...c.slice(i - 23, i).map((x) => x.high)) - a[i - 1] * 3)) return mk(c, i, "long", a, 0.69, "Trailing-stop bot: long trend follow", 3, [2, 4, 6]);
  if (closes[i] < shortStop && closes[i - 1] >= (Math.min(...c.slice(i - 23, i).map((x) => x.low)) + a[i - 1] * 3)) return mk(c, i, "short", a, 0.69, "Trailing-stop bot: short trend follow", 3, [2, 4, 6]);
  return makeSignal({ reason: "Trailing stop holding" });
}

// 6. Ladder / Scaled Entry (at support levels)
export function ladderEntry(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i], win = c.slice(i - 40, i);
  const lo = Math.min(...win.map((x) => x.low)), hi = Math.max(...win.map((x) => x.high));
  const support = lo + (hi - lo) * 0.236; // alt ladder seviyesi
  if (Math.abs(cur.low - support) < a[i] * 0.7 && cur.close > cur.open) return mk(c, i, "long", a, 0.69, "Ladder entry at lower support tier", 2.5, [1.5, 3, 5]);
  const resistance = hi - (hi - lo) * 0.236;
  if (Math.abs(cur.high - resistance) < a[i] * 0.7 && cur.close < cur.open) return mk(c, i, "short", a, 0.69, "Ladder entry at upper resistance tier", 2.5, [1.5, 3, 5]);
  return makeSignal({ reason: "Not at a ladder tier" });
}

// 7. Mean Reversion Grid (Bollinger-based grid)
export function meanReversionGrid(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const ma = sma(closes, 20), win = closes.slice(i - 20, i + 1), mean = win.reduce((x, y) => x + y, 0) / 21;
  const sd = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / 21);
  const dev = sd ? (closes[i] - ma[i]) / sd : 0;
  // Ortalamadan -1.5σ/-2.5σ gridlerde long, +tarafta short (range piyasası)
  if (dev <= -1.5 && dev > -3) return mk(c, i, "long", a, 0.7, `Mean-reversion grid long (${dev.toFixed(1)}σ below mean)`, 2, [1, 2, 3]);
  if (dev >= 1.5 && dev < 3) return mk(c, i, "short", a, 0.7, `Mean-reversion grid short (${dev.toFixed(1)}σ above mean)`, 2, [1, 2, 3]);
  return makeSignal({ reason: `Within grid (${dev.toFixed(1)}σ)` });
}

// 8. Breakout Grid (trend grid — buy higher highs)
export function breakoutGrid(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  const step = (hi - lo) / 4;
  // Üst grid çizgisini kırınca trend yönünde ekle
  if (cur.close > hi && c[i - 1].close <= hi) return mk(c, i, "long", a, 0.7, "Breakout grid: new upper level broken", 2, [2, 3.5, 5]);
  if (cur.close < lo && c[i - 1].close >= lo) return mk(c, i, "short", a, 0.7, "Breakout grid: new lower level broken", 2, [2, 3.5, 5]);
  return makeSignal({ reason: "No grid breakout" });
}

// 9. TWAP Entry (time-weighted, enter on stable pullback)
export function twapEntry(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const twap = closes.slice(i - 20, i + 1).reduce((x, y) => x + y, 0) / 21;
  const e = ema(closes, 50);
  // Fiyat TWAP altına sarkıp yukarı trendde = kademeli TWAP alımı
  if (closes[i] > e[i] && closes[i] < twap && closes[i] > closes[i - 1]) return mk(c, i, "long", a, 0.68, "TWAP entry: below TWAP in uptrend", 2.5, [1.5, 3, 4.5]);
  if (closes[i] < e[i] && closes[i] > twap && closes[i] < closes[i - 1]) return mk(c, i, "short", a, 0.68, "TWAP entry: above TWAP in downtrend", 2.5, [1.5, 3, 4.5]);
  return makeSignal({ reason: "No TWAP entry" });
}

// 10. Rebalancing Bands (allocation drift)
export function rebalanceBands(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  const anchor = sma(closes, 50)[i]; // hedef "değer" ortalaması
  const drift = (closes[i] - anchor) / anchor;
  // Fiyat hedefin %8 altına düşünce al (underweight), %8 üstüne çıkınca sat (overweight)
  if (drift <= -0.08) return mk(c, i, "long", a, 0.68, `Rebalance: underweight (${(drift * 100).toFixed(0)}% below anchor)`, 3, [1.5, 3, 5]);
  if (drift >= 0.08) return mk(c, i, "short", a, 0.68, `Rebalance: overweight (${(drift * 100).toFixed(0)}% above anchor)`, 3, [1.5, 3, 5]);
  return makeSignal({ reason: `Within rebalance band (${(drift * 100).toFixed(0)}%)` });
}
