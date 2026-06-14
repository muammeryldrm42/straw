import { Candle, Signal, makeSignal, sma, atr, swingHighs, swingLows } from "../indicators";

// 1. Opening Range Breakout (ORB) - ilk N mumun range'i, sonraki kırılım
export function openingRangeBreakout(c: Candle[]): Signal {
  if (c.length < 70) return makeSignal({ reason: "Insufficient data" });
  // Son 60 mumun ilk 15'i = "opening range"
  const window = c.slice(-60);
  const orCandles = window.slice(0, 15);
  const orH = Math.max(...orCandles.map((x) => x.high));
  const orL = Math.min(...orCandles.map((x) => x.low));
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  const volOk = cur.volume > avgV * 1.2;
  // Kırılım son birkaç mumda gerçekleşmeli (taze)
  if (cur.close > orH && prev.close <= orH && volOk) {
    const sl = orL, r = cur.close - (orH + orL) / 2;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: orH - (orH - orL) * 0.5, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3], confidence: 0.72, reason: "Opening range breakout UP + volume" });
  }
  if (cur.close < orL && prev.close >= orL && volOk) {
    const r = (orH + orL) / 2 - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: orL + (orH - orL) * 0.5, take_profit: [cur.close - r * 1, cur.close - r * 2, cur.close - r * 3], confidence: 0.72, reason: "Opening range breakdown DOWN + volume" });
  }
  return makeSignal({ reason: "No opening range breakout" });
}

// 2. Channel Breakout - swing high/low kanalından kırılım
export function channelBreakout(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 5), sl = swingLows(c, 5);
  const highs: number[] = [], lows: number[] = [];
  for (let k = c.length - 50; k < c.length; k++) {
    if (sh[k] !== null) highs.push(sh[k] as number);
    if (sl[k] !== null) lows.push(sl[k] as number);
  }
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "No clear channel" });
  const upper = Math.max(...highs), lower = Math.min(...lows);
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  // Kanal genişliği makul mü (en az 2 ATR)
  if (upper - lower < a[i] * 2) return makeSignal({ reason: "Channel too tight" });
  if (cur.close > upper && prev.close <= upper && cur.volume > avgV * 1.3) {
    const sl2 = upper - a[i], r = cur.close - sl2;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl2, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: "Channel breakout UP + volume" });
  }
  if (cur.close < lower && prev.close >= lower && cur.volume > avgV * 1.3) {
    const sl2 = lower + a[i], r = sl2 - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl2, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: "Channel breakdown DOWN + volume" });
  }
  return makeSignal({ reason: "Price inside channel" });
}

// 3. Volatility Contraction Pattern (VCP) - daralan dalgalanma + kırılım (Minervini)
export function volatilityContraction(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  // Son 3 pencerenin range'i giderek daralmalı
  const w1 = c.slice(-45, -30), w2 = c.slice(-30, -15), w3 = c.slice(-15);
  const range = (w: Candle[]) => Math.max(...w.map((x) => x.high)) - Math.min(...w.map((x) => x.low));
  const r1 = range(w1), r2 = range(w2), r3 = range(w3);
  // Contraction: her pencere bir öncekinden dar
  if (!(r2 < r1 * 0.85 && r3 < r2 * 0.85)) return makeSignal({ reason: "No volatility contraction" });
  // Hacim de düşmeli (kuruma)
  const v1 = sma(w1.map((x) => x.volume), w1.length)[w1.length - 1];
  const v3 = sma(w3.map((x) => x.volume), w3.length)[w3.length - 1];
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const w3H = Math.max(...w3.map((x) => x.high)), w3L = Math.min(...w3.map((x) => x.low));
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  // Kırılım: son daralma penceresinin üstüne + hacim patlaması
  if (cur.close > w3H * 0.999 && cur.volume > avgV * 1.5 && cur.close > cur.open) {
    const sl = w3L, r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.77, reason: "VCP breakout: contraction + volume surge" });
  }
  return makeSignal({ reason: "VCP forming, no breakout yet" });
}

// 4. Darvas Box - yeni high sonrası kutu konsolidasyonu, kutu üstü kırılım
export function darvasBox(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const lookback = 40;
  const recent = c.slice(-lookback);
  const boxTop = Math.max(...recent.map((x) => x.high));
  const topIdx = recent.findIndex((x) => x.high === boxTop);
  // Kutu, top yapıldıktan sonraki mumlardan oluşur
  const afterTop = recent.slice(topIdx + 1);
  if (afterTop.length < 4) return makeSignal({ reason: "Box not formed (top too recent)" });
  const boxBottom = Math.min(...afterTop.map((x) => x.low));
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  // Kutu yüksekliği makul (çok geniş değil)
  if (boxTop - boxBottom > a[i] * 8) return makeSignal({ reason: "Box too wide" });
  // Kutu üstü kırılım = long
  if (cur.close > boxTop && prev.close <= boxTop && cur.volume > avgV * 1.3) {
    const sl = boxBottom, r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3], confidence: 0.74, reason: "Darvas box breakout UP + volume" });
  }
  // Kutu altı kırılım = short
  if (cur.close < boxBottom && prev.close >= boxBottom && cur.volume > avgV * 1.3) {
    const sl = boxTop, r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 2, cur.close - r * 3], confidence: 0.7, reason: "Darvas box breakdown DOWN + volume" });
  }
  return makeSignal({ reason: "Price inside Darvas box" });
}
