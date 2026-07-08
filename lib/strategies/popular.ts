import { Candle, Signal, makeSignal, sma, ema, rsi, atr, bollingerBands, macd } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

function hma(values: number[], period: number): number[] {
  const wma = (arr: number[], p: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i < p - 1) { out.push(arr[i]); continue; }
      let num = 0, den = 0;
      for (let k = 0; k < p; k++) { const w = p - k; num += arr[i - k] * w; den += w; }
      out.push(num / den);
    }
    return out;
  };
  const half = Math.max(1, Math.floor(period / 2));
  const sqrtP = Math.max(1, Math.round(Math.sqrt(period)));
  const w1 = wma(values, half), w2 = wma(values, period);
  const raw = w1.map((v, i) => 2 * v - w2[i]);
  return wma(raw, sqrtP);
}

function keltner(c: Candle[], p: number, mult: number) {
  const closes = c.map((x) => x.close), mid = ema(closes, p), a = atr(c, p);
  return { mid, upper: mid.map((v, i) => v + mult * a[i]), lower: mid.map((v, i) => v - mult * a[i]) };
}

// 1. TTM Squeeze (BB inside Keltner → momentum breakout)
export function ttmSqueeze(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), bb = bollingerBands(closes, 20, 2), kc = keltner(c, 20, 1.5), a = atr(c, 14), i = c.length - 1;
  const squeezeOn = (idx: number) => bb.lower[idx] > kc.lower[idx] && bb.upper[idx] < kc.upper[idx];
  // Momentum: close - midpoint donchian/sma
  const mom = closes.map((v, idx) => (idx < 20 ? 0 : v - (Math.max(...c.slice(idx - 20, idx).map((x) => x.high)) + Math.min(...c.slice(idx - 20, idx).map((x) => x.low)) + sma(closes, 20)[idx]) / 3));
  // Squeeze biraz önce vardı, şimdi bitti (fire) + momentum yönü
  if (squeezeOn(i - 1) && !squeezeOn(i) && mom[i] > 0) return mk(c, i, "long", a, 0.74, "TTM Squeeze fired long (momentum up)");
  if (squeezeOn(i - 1) && !squeezeOn(i) && mom[i] < 0) return mk(c, i, "short", a, 0.74, "TTM Squeeze fired short (momentum down)");
  return makeSignal({ reason: squeezeOn(i) ? "Squeeze on (waiting for release)" : "No squeeze release" });
}

// 2. WaveTrend Oscillator (LazyBear)
export function waveTrend(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const ap = c.map((x) => (x.high + x.low + x.close) / 3);
  const esa = ema(ap, 10), d = ema(ap.map((v, i) => Math.abs(v - esa[i])), 10);
  const ci = ap.map((v, i) => (d[i] ? (v - esa[i]) / (0.015 * d[i]) : 0));
  const wt1 = ema(ci, 21), wt2 = sma(wt1, 4), a = atr(c, 14), i = c.length - 1;
  if (wt1[i - 1] <= wt2[i - 1] && wt1[i] > wt2[i] && wt1[i] < -53) return mk(c, i, "long", a, 0.73, "WaveTrend bullish cross (oversold)");
  if (wt1[i - 1] >= wt2[i - 1] && wt1[i] < wt2[i] && wt1[i] > 53) return mk(c, i, "short", a, 0.73, "WaveTrend bearish cross (overbought)");
  return makeSignal({ reason: `WaveTrend ${wt1[i].toFixed(0)}` });
}

// 3. UT Bot (ATR trailing stop, Yo_adde)
export function utBot(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const key = 1, period = 10, a = atr(c, period), closes = c.map((x) => x.close);
  const stops: number[] = [closes[0]];
  for (let i = 1; i < c.length; i++) {
    const nLoss = key * a[i], prev = stops[i - 1];
    let st: number;
    if (closes[i] > prev && closes[i - 1] > prev) st = Math.max(prev, closes[i] - nLoss);
    else if (closes[i] < prev && closes[i - 1] < prev) st = Math.min(prev, closes[i] + nLoss);
    else st = closes[i] > prev ? closes[i] - nLoss : closes[i] + nLoss;
    stops.push(st);
  }
  const i = c.length - 1;
  if (closes[i - 1] <= stops[i - 1] && closes[i] > stops[i]) return mk(c, i, "long", a, 0.73, "UT Bot buy (price crossed above trailing stop)");
  if (closes[i - 1] >= stops[i - 1] && closes[i] < stops[i]) return mk(c, i, "short", a, 0.73, "UT Bot sell (price crossed below trailing stop)");
  return makeSignal({ reason: "UT Bot: no flip" });
}

// 4. QQE Mod (RSI-based, smoothed)
export function qqeMod(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), rsiP = 14, sf = 5;
  const r = rsi(closes, rsiP), rsiMa = ema(r, sf);
  const atrRsi = rsiMa.map((v, i) => (i === 0 ? 0 : Math.abs(rsiMa[i - 1] - v)));
  const maAtrRsi = ema(atrRsi, 27), dar = ema(maAtrRsi, 27).map((v) => v * 4.236);
  const i = c.length - 1, a = atr(c, 14);
  // RSI smoothed cross of 50 with band confirmation
  if (rsiMa[i - 1] <= 50 && rsiMa[i] > 50 && rsiMa[i] - rsiMa[i - 1] > 0) return mk(c, i, "long", a, 0.71, "QQE Mod bullish (smoothed RSI > 50)");
  if (rsiMa[i - 1] >= 50 && rsiMa[i] < 50 && rsiMa[i - 1] - rsiMa[i] > 0) return mk(c, i, "short", a, 0.71, "QQE Mod bearish (smoothed RSI < 50)");
  return makeSignal({ reason: `QQE RSI-MA ${rsiMa[i].toFixed(0)}` });
}

// 5. SSL Channel (ErwinBeckers)
export function sslChannel(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const smaHigh = sma(c.map((x) => x.high), 10), smaLow = sma(c.map((x) => x.low), 10), closes = c.map((x) => x.close);
  const hlv: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (closes[i] > smaHigh[i]) hlv.push(1);
    else if (closes[i] < smaLow[i]) hlv.push(-1);
    else hlv.push(i > 0 ? hlv[i - 1] : 1);
  }
  const sslDown = hlv.map((h, i) => (h < 0 ? smaHigh[i] : smaLow[i]));
  const sslUp = hlv.map((h, i) => (h < 0 ? smaLow[i] : smaHigh[i]));
  const i = c.length - 1, a = atr(c, 14);
  if (sslUp[i - 1] <= sslDown[i - 1] && sslUp[i] > sslDown[i]) return mk(c, i, "long", a, 0.72, "SSL Channel bullish cross");
  if (sslUp[i - 1] >= sslDown[i - 1] && sslUp[i] < sslDown[i]) return mk(c, i, "short", a, 0.72, "SSL Channel bearish cross");
  return makeSignal({ reason: "No SSL cross" });
}

// 6. HalfTrend (everget)
export function halfTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const amp = 2, closes = c.map((x) => x.close), highMa = sma(c.map((x) => x.high), amp), lowMa = sma(c.map((x) => x.low), amp), a = atr(c, 14), i = c.length - 1;
  // Basitleştirilmiş HalfTrend: trend yönü highMa/lowMa kırılımına göre
  const trend: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    let tr = trend[k - 1];
    if (closes[k] > highMa[k - 1]) tr = 1;
    else if (closes[k] < lowMa[k - 1]) tr = -1;
    trend.push(tr);
  }
  if (trend[i - 1] <= 0 && trend[i] > 0) return mk(c, i, "long", a, 0.71, "HalfTrend flipped bullish");
  if (trend[i - 1] >= 0 && trend[i] < 0) return mk(c, i, "short", a, 0.71, "HalfTrend flipped bearish");
  return makeSignal({ reason: "HalfTrend unchanged" });
}

// 7. Range Filter (DonovanWall)
export function rangeFilter(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), per = 14, mult = 2.618;
  const absChg = closes.map((v, i) => (i === 0 ? 0 : Math.abs(v - closes[i - 1])));
  const avrng = ema(absChg, per), smrng = ema(avrng, per * 2 - 1).map((v) => v * mult);
  const filt: number[] = [closes[0]];
  for (let i = 1; i < c.length; i++) {
    const prev = filt[i - 1];
    let f = prev;
    if (closes[i] > prev) f = closes[i] - smrng[i] < prev ? prev : closes[i] - smrng[i];
    else f = closes[i] + smrng[i] > prev ? prev : closes[i] + smrng[i];
    filt.push(f);
  }
  const i = c.length - 1, a = atr(c, 14);
  if (filt[i] > filt[i - 1] && closes[i] > filt[i] && closes[i - 1] <= filt[i - 1]) return mk(c, i, "long", a, 0.7, "Range Filter bullish breakout");
  if (filt[i] < filt[i - 1] && closes[i] < filt[i] && closes[i - 1] >= filt[i - 1]) return mk(c, i, "short", a, 0.7, "Range Filter bearish breakout");
  return makeSignal({ reason: "Inside range filter" });
}

// 8. Hull Suite (HMA trend)
export function hullSuite(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), h = hma(closes, 55), a = atr(c, 14), i = c.length - 1;
  if (h[i - 2] >= h[i - 1] && h[i] > h[i - 1]) return mk(c, i, "long", a, 0.71, "Hull Suite turned up");
  if (h[i - 2] <= h[i - 1] && h[i] < h[i - 1]) return mk(c, i, "short", a, 0.71, "Hull Suite turned down");
  return makeSignal({ reason: "Hull trend unchanged" });
}

// 9. Squeeze Momentum (LazyBear)
export function squeezeMomentum(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), i = c.length - 1, a = atr(c, 14);
  // momentum = linreg(close - avg(highest, lowest, sma), 20)
  const mom: number[] = [];
  for (let k = 0; k < c.length; k++) {
    if (k < 20) { mom.push(0); continue; }
    const win = c.slice(k - 20, k);
    const ref = (Math.max(...win.map((x) => x.high)) + Math.min(...win.map((x) => x.low))) / 2;
    const smaV = sma(closes, 20)[k];
    mom.push(closes[k] - (ref + smaV) / 2);
  }
  // Momentum sıfırı keserken + ivme
  if (mom[i - 1] <= 0 && mom[i] > 0) return mk(c, i, "long", a, 0.71, "Squeeze Momentum turned positive");
  if (mom[i - 1] >= 0 && mom[i] < 0) return mk(c, i, "short", a, 0.71, "Squeeze Momentum turned negative");
  return makeSignal({ reason: `Squeeze mom ${mom[i].toFixed(2)}` });
}

// 10. Chaikin Oscillator
export function chaikinOsc(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const adl: number[] = [];
  let cum = 0;
  for (const x of c) {
    const mfm = x.high === x.low ? 0 : ((x.close - x.low) - (x.high - x.close)) / (x.high - x.low);
    cum += mfm * x.volume; adl.push(cum);
  }
  const osc = ema(adl, 3).map((v, i) => v - ema(adl, 10)[i]), i = c.length - 1, a = atr(c, 14);
  if (osc[i - 1] <= 0 && osc[i] > 0) return mk(c, i, "long", a, 0.69, "Chaikin Oscillator crossed above zero");
  if (osc[i - 1] >= 0 && osc[i] < 0) return mk(c, i, "short", a, 0.69, "Chaikin Oscillator crossed below zero");
  return makeSignal({ reason: `Chaikin Osc ${osc[i].toFixed(0)}` });
}

// 11. Klinger Oscillator
export function klingerOsc(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const vf: number[] = [];
  let trendV = 1;
  for (let i = 0; i < c.length; i++) {
    if (i === 0) { vf.push(0); continue; }
    const hlc = c[i].high + c[i].low + c[i].close, hlcPrev = c[i - 1].high + c[i - 1].low + c[i - 1].close;
    trendV = hlc > hlcPrev ? 1 : -1;
    vf.push(c[i].volume * trendV);
  }
  const kvo = ema(vf, 34).map((v, i) => v - ema(vf, 55)[i]), sig = ema(kvo, 13), i = c.length - 1, a = atr(c, 14);
  if (kvo[i - 1] <= sig[i - 1] && kvo[i] > sig[i]) return mk(c, i, "long", a, 0.69, "Klinger bullish signal cross");
  if (kvo[i - 1] >= sig[i - 1] && kvo[i] < sig[i]) return mk(c, i, "short", a, 0.69, "Klinger bearish signal cross");
  return makeSignal({ reason: "No Klinger cross" });
}

// 12. Elder Impulse System
export function elderImpulse(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 13), m = macd(closes), i = c.length - 1, a = atr(c, 14);
  const emaUp = e[i] > e[i - 1], histUp = m.histogram[i] > m.histogram[i - 1];
  const emaUpPrev = e[i - 1] > e[i - 2], histUpPrev = m.histogram[i - 1] > m.histogram[i - 2];
  // Yeşil impulse (ikisi de yukarı) yeni başladı = long
  if (emaUp && histUp && !(emaUpPrev && histUpPrev)) return mk(c, i, "long", a, 0.71, "Elder Impulse turned green (EMA + MACD up)");
  if (!emaUp && !histUp && (emaUpPrev || histUpPrev)) return mk(c, i, "short", a, 0.71, "Elder Impulse turned red (EMA + MACD down)");
  return makeSignal({ reason: "Elder Impulse neutral (blue)" });
}

// 13. Volume-Weighted MACD
export function vwMacd(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  // volume-weighted price MA
  const vwma = (p: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < c.length; i++) {
      if (i < p - 1) { out.push(c[i].close); continue; }
      let pv = 0, v = 0;
      for (let k = 0; k < p; k++) { pv += c[i - k].close * c[i - k].volume; v += c[i - k].volume; }
      out.push(v ? pv / v : c[i].close);
    }
    return out;
  };
  const fast = vwma(12), slow = vwma(26), macdLine = fast.map((v, i) => v - slow[i]), sig = ema(macdLine, 9), i = c.length - 1, a = atr(c, 14);
  if (macdLine[i - 1] <= sig[i - 1] && macdLine[i] > sig[i]) return mk(c, i, "long", a, 0.71, "Volume-Weighted MACD bullish cross");
  if (macdLine[i - 1] >= sig[i - 1] && macdLine[i] < sig[i]) return mk(c, i, "short", a, 0.71, "Volume-Weighted MACD bearish cross");
  return makeSignal({ reason: "No VW-MACD cross" });
}

// 14. Coral Trend (Ehlers, triple smoothed)
export function coralTrend(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const t = ema(ema(ema(closes, 9), 9), 9), a = atr(c, 14), i = c.length - 1;
  if (t[i - 2] >= t[i - 1] && t[i] > t[i - 1]) return mk(c, i, "long", a, 0.69, "Coral Trend turned up");
  if (t[i - 2] <= t[i - 1] && t[i] < t[i - 1]) return mk(c, i, "short", a, 0.69, "Coral Trend turned down");
  return makeSignal({ reason: "Coral trend flat" });
}
