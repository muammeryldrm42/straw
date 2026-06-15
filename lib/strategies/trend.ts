import { Candle, Signal, makeSignal, ema, sma, macd, atr } from "../indicators";

// 1. EMA Ribbon - çoklu EMA hizalaması (8/13/21/34/55)
export function emaRibbon(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const e8 = ema(closes, 8), e13 = ema(closes, 13), e21 = ema(closes, 21), e34 = ema(closes, 34), e55 = ema(closes, 55);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const up = e8[i] > e13[i] && e13[i] > e21[i] && e21[i] > e34[i] && e34[i] > e55[i];
  const down = e8[i] < e13[i] && e13[i] < e21[i] && e21[i] < e34[i] && e34[i] < e55[i];
  // Yeni hizalanma mı? (önceki mumda tam hizalı değildi)
  const upPrev = e8[i-1] > e13[i-1] && e13[i-1] > e21[i-1] && e21[i-1] > e34[i-1] && e34[i-1] > e55[i-1];
  const downPrev = e8[i-1] < e13[i-1] && e13[i-1] < e21[i-1] && e21[i-1] < e34[i-1] && e34[i-1] < e55[i-1];
  if (up && cur.close > e8[i]) {
    const sl = e34[i] - 0.5 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: upPrev ? 0.72 : 0.78, reason: upPrev ? "EMA ribbon bullish (aligned)" : "EMA ribbon NEW bullish alignment" });
  }
  if (down && cur.close < e8[i]) {
    const sl = e34[i] + 0.5 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: downPrev ? 0.72 : 0.78, reason: downPrev ? "EMA ribbon bearish (aligned)" : "EMA ribbon NEW bearish alignment" });
  }
  return makeSignal({ reason: "EMA ribbon not aligned (chop)" });
}

// 2. MACD Zero Cross - MACD çizgisi sıfır çizgisini geçer (güçlü trend onayı)
export function macdZeroCross(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const m = macd(closes, 12, 26, 9);
  const e200 = ema(closes, 200 > c.length ? Math.floor(c.length / 2) : 200);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // MACD line önceki mumda <0, şimdi >0 = bullish zero cross
  const bullCross = m.macd[i - 1] <= 0 && m.macd[i] > 0;
  const bearCross = m.macd[i - 1] >= 0 && m.macd[i] < 0;
  if (bullCross && cur.close > e200[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.74, reason: "MACD zero-line cross UP + above EMA200" });
  }
  if (bearCross && cur.close < e200[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.74, reason: "MACD zero-line cross DOWN + below EMA200" });
  }
  return makeSignal({ reason: "No MACD zero-line cross" });
}

// 3. Heikin Ashi Trend - HA mumları renk değişimi + gövde gücü
export function heikinAshiTrend(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  // Heikin Ashi hesapla
  const ha: { open: number; high: number; low: number; close: number }[] = [];
  for (let k = 0; k < c.length; k++) {
    const haClose = (c[k].open + c[k].high + c[k].low + c[k].close) / 4;
    const haOpen = k === 0 ? (c[k].open + c[k].close) / 2 : (ha[k - 1].open + ha[k - 1].close) / 2;
    const haHigh = Math.max(c[k].high, haOpen, haClose);
    const haLow = Math.min(c[k].low, haOpen, haClose);
    ha.push({ open: haOpen, high: haHigh, low: haLow, close: haClose });
  }
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const last3 = ha.slice(-3);
  const allGreen = last3.every((x) => x.close > x.open);
  const allRed = last3.every((x) => x.close < x.open);
  // Önceki mum kırmızı -> dönüş yakalamak için ilk yeşil 3'lü tercih edilir
  const flippedToGreen = ha[i - 3] && ha[i - 3].close < ha[i - 3].open && allGreen;
  const flippedToRed = ha[i - 3] && ha[i - 3].close > ha[i - 3].open && allRed;
  // Gövde gücü: alt fitil yok (long) = güçlü trend
  const curHa = ha[i];
  const strongBull = curHa.close > curHa.open && (curHa.open - curHa.low) < (curHa.high - curHa.low) * 0.15;
  const strongBear = curHa.close < curHa.open && (curHa.high - curHa.open) < (curHa.high - curHa.low) * 0.15;
  if (allGreen && strongBull) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: flippedToGreen ? 0.75 : 0.7, reason: flippedToGreen ? "Heikin Ashi flip to strong bull" : "Heikin Ashi strong bull trend" });
  }
  if (allRed && strongBear) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: flippedToRed ? 0.75 : 0.7, reason: flippedToRed ? "Heikin Ashi flip to strong bear" : "Heikin Ashi strong bear trend" });
  }
  return makeSignal({ reason: "Heikin Ashi no strong trend" });
}

// 4. ADX Trend Rider - ADX > 25 + DI cross (Wilder DMI)
export function adxTrendRider(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const period = 14;
  const tr: number[] = [], plusDM: number[] = [], minusDM: number[] = [];
  for (let k = 1; k < c.length; k++) {
    const up = c[k].high - c[k - 1].high;
    const dn = c[k - 1].low - c[k].low;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close)));
  }
  // Wilder smoothing
  const smooth = (arr: number[]) => {
    const out: number[] = []; let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
    out[period - 1] = s;
    for (let k = period; k < arr.length; k++) { s = s - s / period + arr[k]; out[k] = s; }
    return out;
  };
  const trS = smooth(tr), pdmS = smooth(plusDM), mdmS = smooth(minusDM);
  const plusDI: number[] = [], minusDI: number[] = [], dx: number[] = [];
  for (let k = 0; k < trS.length; k++) {
    if (trS[k] === undefined || trS[k] === 0) continue;
    const pDI = (pdmS[k] / trS[k]) * 100, mDI = (mdmS[k] / trS[k]) * 100;
    plusDI[k] = pDI; minusDI[k] = mDI;
    dx[k] = (Math.abs(pDI - mDI) / (pDI + mDI || 1)) * 100;
  }
  // ADX = DX'in smoothed ortalaması
  const dxVals = dx.filter((v) => v !== undefined);
  const adx = sma(dx.map((v) => v ?? 0), period);
  const j = c.length - 2; // tr arrays 1 kaydık (k başlangıç 1)
  const last = plusDI.length - 1;
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const adxNow = adx[adx.length - 1];
  if (adxNow < 25) return makeSignal({ reason: `ADX weak (${adxNow?.toFixed(0)}) - no trend` });
  // DI cross
  const pNow = plusDI[last], mNow = minusDI[last], pPrev = plusDI[last - 1], mPrev = minusDI[last - 1];
  if (pPrev <= mPrev && pNow > mNow) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.76, reason: `ADX ${adxNow.toFixed(0)} + +DI cross above -DI` });
  }
  if (mPrev <= pPrev && mNow > pNow) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.76, reason: `ADX ${adxNow.toFixed(0)} + -DI cross above +DI` });
  }
  return makeSignal({ reason: `ADX strong (${adxNow.toFixed(0)}) but no DI cross` });
}
