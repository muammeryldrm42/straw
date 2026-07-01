// Grafik göstergeleri — indicators.ts'i (stratejiler kullanıyor) bozmadan, chart-only hesaplar.
// Tümü candle.time ile hizalı number[] döner; hesaplanamayan barlar NaN'dir (grafikte boşluk).
import { Candle, ema, sma, rsi, macd, atr, bollingerBands, vwap, swingHighs, swingLows } from "./indicators";
export { ema, sma, rsi, macd, atr, bollingerBands, vwap, swingHighs, swingLows };
export type { Candle };

const hh = (c: Candle[], i: number, n: number) => { let m = -Infinity; for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.max(m, c[k].high); return m; };
const ll = (c: Candle[], i: number, n: number) => { let m = Infinity; for (let k = Math.max(0, i - n + 1); k <= i; k++) m = Math.min(m, c[k].low); return m; };

// Stochastic %K / %D
export function stochastic(c: Candle[], kP = 14, dP = 3) {
  const k: number[] = c.map((_, i) => {
    if (i < kP - 1) return NaN;
    const h = hh(c, i, kP), l = ll(c, i, kP);
    return h === l ? 50 : ((c[i].close - l) / (h - l)) * 100;
  });
  const d = sma(k.map((v) => (isNaN(v) ? 0 : v)), dP).map((v, i) => (isNaN(k[i]) ? NaN : v));
  return { k, d };
}

// Williams %R
export function williamsR(c: Candle[], n = 14): number[] {
  return c.map((_, i) => {
    if (i < n - 1) return NaN;
    const h = hh(c, i, n), l = ll(c, i, n);
    return h === l ? -50 : ((h - c[i].close) / (h - l)) * -100;
  });
}

// CCI
export function cci(c: Candle[], n = 20): number[] {
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  const ma = sma(tp, n);
  return c.map((_, i) => {
    if (i < n - 1) return NaN;
    let dev = 0;
    for (let k = i - n + 1; k <= i; k++) dev += Math.abs(tp[k] - ma[i]);
    dev /= n;
    return dev === 0 ? 0 : (tp[i] - ma[i]) / (0.015 * dev);
  });
}

// OBV
export function obv(c: Candle[]): number[] {
  let v = 0;
  return c.map((x, i) => {
    if (i === 0) return 0;
    if (x.close > c[i - 1].close) v += x.volume;
    else if (x.close < c[i - 1].close) v -= x.volume;
    return v;
  });
}

// MFI
export function mfi(c: Candle[], n = 14): number[] {
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  return c.map((_, i) => {
    if (i < n) return NaN;
    let pos = 0, neg = 0;
    for (let k = i - n + 1; k <= i; k++) {
      const flow = tp[k] * c[k].volume;
      if (tp[k] > tp[k - 1]) pos += flow;
      else if (tp[k] < tp[k - 1]) neg += flow;
    }
    return neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  });
}

// ADX (+DI / -DI / ADX)
export function adx(c: Candle[], n = 14) {
  const tr: number[] = [], plusDM: number[] = [], minusDM: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i === 0) { tr.push(c[i].high - c[i].low); plusDM.push(0); minusDM.push(0); continue; }
    const up = c[i].high - c[i - 1].high, dn = c[i - 1].low - c[i].low;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  }
  const smooth = (arr: number[]) => { const out: number[] = []; let s = 0; for (let i = 0; i < arr.length; i++) { if (i < n) { s += arr[i]; out.push(NaN); if (i === n - 1) out[i] = s; } else { s = out[i - 1] - out[i - 1] / n + arr[i]; out.push(s); } } return out; };
  const trS = smooth(tr), pS = smooth(plusDM), mS = smooth(minusDM);
  const plusDI = c.map((_, i) => (isNaN(trS[i]) || trS[i] === 0 ? NaN : (pS[i] / trS[i]) * 100));
  const minusDI = c.map((_, i) => (isNaN(trS[i]) || trS[i] === 0 ? NaN : (mS[i] / trS[i]) * 100));
  const dx = c.map((_, i) => { const a = plusDI[i], b = minusDI[i]; return isNaN(a) || isNaN(b) || a + b === 0 ? NaN : (Math.abs(a - b) / (a + b)) * 100; });
  const adxArr: number[] = []; let s = 0, cnt = 0;
  for (let i = 0; i < dx.length; i++) {
    if (isNaN(dx[i])) { adxArr.push(NaN); continue; }
    cnt++;
    if (cnt <= n) { s += dx[i]; adxArr.push(cnt === n ? s / n : NaN); }
    else { const prev = adxArr[i - 1]; adxArr.push((prev * (n - 1) + dx[i]) / n); }
  }
  return { plusDI, minusDI, adx: adxArr };
}

// SuperTrend (ATR bazlı)
export function superTrend(c: Candle[], period = 10, mult = 3) {
  const a = atr(c, period);
  const up: number[] = [], dn: number[] = [], trend: number[] = [];
  const line: number[] = [];
  for (let i = 0; i < c.length; i++) {
    const mid = (c[i].high + c[i].low) / 2;
    const bu = mid + mult * a[i], bl = mid - mult * a[i];
    if (i === 0 || isNaN(a[i])) { up.push(bu); dn.push(bl); trend.push(1); line.push(NaN); continue; }
    up.push(bu < up[i - 1] || c[i - 1].close > up[i - 1] ? bu : up[i - 1]);
    dn.push(bl > dn[i - 1] || c[i - 1].close < dn[i - 1] ? bl : dn[i - 1]);
    let tr = trend[i - 1];
    if (tr === 1 && c[i].close < dn[i]) tr = -1;
    else if (tr === -1 && c[i].close > up[i]) tr = 1;
    trend.push(tr);
    line.push(tr === 1 ? dn[i] : up[i]);
  }
  return { line, trend };
}

// Parabolic SAR
export function psar(c: Candle[], step = 0.02, max = 0.2): number[] {
  const out: number[] = new Array(c.length).fill(NaN);
  if (c.length < 2) return out;
  let bull = true, af = step, ep = c[0].high, sar = c[0].low;
  for (let i = 1; i < c.length; i++) {
    sar = sar + af * (ep - sar);
    if (bull) {
      if (c[i].low < sar) { bull = false; sar = ep; ep = c[i].low; af = step; }
      else { if (c[i].high > ep) { ep = c[i].high; af = Math.min(af + step, max); } sar = Math.min(sar, c[i - 1].low, i >= 2 ? c[i - 2].low : c[i - 1].low); }
    } else {
      if (c[i].high > sar) { bull = true; sar = ep; ep = c[i].high; af = step; }
      else { if (c[i].low < ep) { ep = c[i].low; af = Math.min(af + step, max); } sar = Math.max(sar, c[i - 1].high, i >= 2 ? c[i - 2].high : c[i - 1].high); }
    }
    out[i] = sar;
  }
  return out;
}

// Donchian Channel
export function donchian(c: Candle[], n = 20) {
  const upper = c.map((_, i) => (i < n - 1 ? NaN : hh(c, i, n)));
  const lower = c.map((_, i) => (i < n - 1 ? NaN : ll(c, i, n)));
  const mid = c.map((_, i) => (isNaN(upper[i]) ? NaN : (upper[i] + lower[i]) / 2));
  return { upper, lower, mid };
}

// Ichimoku
export function ichimoku(c: Candle[], conv = 9, base = 26, spanB = 52, disp = 26) {
  const tenkan = c.map((_, i) => (i < conv - 1 ? NaN : (hh(c, i, conv) + ll(c, i, conv)) / 2));
  const kijun = c.map((_, i) => (i < base - 1 ? NaN : (hh(c, i, base) + ll(c, i, base)) / 2));
  // Senkou A/B disp bar ileri kaydırılır
  const senkouA = c.map((_, i) => { const j = i - disp; return j < 0 || isNaN(tenkan[j]) || isNaN(kijun[j]) ? NaN : (tenkan[j] + kijun[j]) / 2; });
  const senkouB = c.map((_, i) => { const j = i - disp; return j < spanB - 1 || j < 0 ? NaN : (hh(c, j, spanB) + ll(c, j, spanB)) / 2; });
  return { tenkan, kijun, senkouA, senkouB };
}

// Pivot Points (klasik) — son bardan tek set seviye
export function pivotPoints(c: Candle[]) {
  if (!c.length) return null;
  const last = c[c.length - 1];
  const pp = (last.high + last.low + last.close) / 3;
  return {
    pp,
    r1: 2 * pp - last.low, s1: 2 * pp - last.high,
    r2: pp + (last.high - last.low), s2: pp - (last.high - last.low),
    r3: last.high + 2 * (pp - last.low), s3: last.low - 2 * (last.high - pp),
  };
}

// Fibonacci retracement — görünen aralığın en yüksek/en düşük noktasından
export function fibLevels(c: Candle[]) {
  if (!c.length) return null;
  let hi = -Infinity, lo = Infinity;
  for (const x of c) { hi = Math.max(hi, x.high); lo = Math.min(lo, x.low); }
  const d = hi - lo;
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  return ratios.map((r) => ({ ratio: r, price: hi - d * r }));
}

// Destek/Direnç — son swing noktaları (yakın olanları kümeler)
export function supportResistance(c: Candle[], lb = 8, maxLevels = 6) {
  const sh = swingHighs(c, lb), sl = swingLows(c, lb);
  const levels: { price: number; type: "res" | "sup" }[] = [];
  for (let i = c.length - 1; i >= 0 && levels.length < maxLevels * 2; i--) {
    if (sh[i] != null) levels.push({ price: sh[i] as number, type: "res" });
    if (sl[i] != null) levels.push({ price: sl[i] as number, type: "sup" });
  }
  // yakın seviyeleri ele (fiyatın %0.5'i içinde olanları tekille)
  const out: { price: number; type: "res" | "sup" }[] = [];
  for (const lv of levels) {
    if (!out.some((o) => Math.abs(o.price - lv.price) / lv.price < 0.005)) out.push(lv);
    if (out.length >= maxLevels) break;
  }
  return out;
}
