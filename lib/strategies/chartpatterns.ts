import { Candle, Signal, makeSignal, atr, sma, swingHighs, swingLows } from "../indicators";

function pivots(c: Candle[], lb = 5) {
  const sh = swingHighs(c, lb), sl = swingLows(c, lb);
  const highs: { idx: number; price: number }[] = [], lows: { idx: number; price: number }[] = [];
  for (let i = 0; i < c.length; i++) {
    if (sh[i] !== null) highs.push({ idx: i, price: sh[i] as number });
    if (sl[i] !== null) lows.push({ idx: i, price: sl[i] as number });
  }
  return { highs, lows };
}

// 1. Double Top
export function doubleTop(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 5);
  if (highs.length < 2 || lows.length < 1) return makeSignal({ reason: "Not enough pivots" });
  const t2 = highs[highs.length - 1], t1 = highs[highs.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // İki tepe birbirine yakın (%1.5)
  if (Math.abs(t2.price - t1.price) / t1.price > 0.015) return makeSignal({ reason: "Tops not equal" });
  const neckline = Math.min(...lows.filter((l) => l.idx > t1.idx && l.idx < t2.idx).map((l) => l.price), Infinity);
  if (!isFinite(neckline)) return makeSignal({ reason: "No neckline" });
  // Neckline kırılımı
  if (cur.close < neckline && c[i - 1].close >= neckline) {
    const sl = t2.price + 0.5 * a[i], r = neckline - cur.close, height = t2.price - neckline;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.74, reason: "Double Top neckline break" });
  }
  return makeSignal({ reason: "Double Top forming" });
}

// 2. Double Bottom
export function doubleBottom(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 5);
  if (lows.length < 2 || highs.length < 1) return makeSignal({ reason: "Not enough pivots" });
  const b2 = lows[lows.length - 1], b1 = lows[lows.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  if (Math.abs(b2.price - b1.price) / b1.price > 0.015) return makeSignal({ reason: "Bottoms not equal" });
  const neckline = Math.max(...highs.filter((h) => h.idx > b1.idx && h.idx < b2.idx).map((h) => h.price), -Infinity);
  if (!isFinite(neckline)) return makeSignal({ reason: "No neckline" });
  if (cur.close > neckline && c[i - 1].close <= neckline) {
    const sl = b2.price - 0.5 * a[i], height = neckline - b2.price;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.74, reason: "Double Bottom neckline break" });
  }
  return makeSignal({ reason: "Double Bottom forming" });
}

// 3. Head & Shoulders
export function headShoulders(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 3 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const [ls, head, rs] = highs.slice(-3);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // Head iki omuzdan yüksek, omuzlar benzer
  if (!(head.price > ls.price && head.price > rs.price)) return makeSignal({ reason: "No H&S structure" });
  if (Math.abs(ls.price - rs.price) / ls.price > 0.03) return makeSignal({ reason: "Shoulders uneven" });
  const neckLows = lows.filter((l) => l.idx > ls.idx && l.idx < rs.idx);
  if (neckLows.length < 1) return makeSignal({ reason: "No neckline" });
  const neckline = neckLows.reduce((s, l) => s + l.price, 0) / neckLows.length;
  if (cur.close < neckline && c[i - 1].close >= neckline) {
    const sl = rs.price + 0.5 * a[i], height = head.price - neckline;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.76, reason: "Head & Shoulders neckline break" });
  }
  return makeSignal({ reason: "H&S forming" });
}

// 4. Inverse Head & Shoulders
export function inverseHeadShoulders(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (lows.length < 3 || highs.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const [ls, head, rs] = lows.slice(-3);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  if (!(head.price < ls.price && head.price < rs.price)) return makeSignal({ reason: "No iH&S structure" });
  if (Math.abs(ls.price - rs.price) / ls.price > 0.03) return makeSignal({ reason: "Shoulders uneven" });
  const neckHighs = highs.filter((h) => h.idx > ls.idx && h.idx < rs.idx);
  if (neckHighs.length < 1) return makeSignal({ reason: "No neckline" });
  const neckline = neckHighs.reduce((s, h) => s + h.price, 0) / neckHighs.length;
  if (cur.close > neckline && c[i - 1].close <= neckline) {
    const sl = rs.price - 0.5 * a[i], height = neckline - head.price;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.76, reason: "Inverse H&S neckline break" });
  }
  return makeSignal({ reason: "iH&S forming" });
}

// 5. Ascending Triangle - düz tepe + yükselen dipler
export function ascendingTriangle(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const h2 = highs[highs.length - 1], h1 = highs[highs.length - 2];
  const l2 = lows[lows.length - 1], l1 = lows[lows.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  const flatTop = Math.abs(h2.price - h1.price) / h1.price < 0.015;
  const risingLows = l2.price > l1.price;
  if (flatTop && risingLows && cur.close > h2.price && c[i - 1].close <= h2.price) {
    const sl = l2.price, r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 0.7, cur.close + r * 1.3, cur.close + r * 2], confidence: 0.73, reason: "Ascending triangle breakout" });
  }
  return makeSignal({ reason: "No ascending triangle break" });
}

// 6. Descending Triangle - düz dip + alçalan tepeler
export function descendingTriangle(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const h2 = highs[highs.length - 1], h1 = highs[highs.length - 2];
  const l2 = lows[lows.length - 1], l1 = lows[lows.length - 2];
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  const flatBottom = Math.abs(l2.price - l1.price) / l1.price < 0.015;
  const fallingHighs = h2.price < h1.price;
  if (flatBottom && fallingHighs && cur.close < l2.price && c[i - 1].close >= l2.price) {
    const sl = h2.price, r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 0.7, cur.close - r * 1.3, cur.close - r * 2], confidence: 0.73, reason: "Descending triangle breakdown" });
  }
  return makeSignal({ reason: "No descending triangle break" });
}

// 7. Bull Flag - güçlü impulse + dar geri çekilme + kırılım
export function bullFlag(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // Pole: son 20-10 mum arası güçlü yükseliş
  const poleStart = c[i - 20], poleEnd = c[i - 8];
  const poleGain = (poleEnd.close - poleStart.close) / poleStart.close;
  if (poleGain < 0.05) return makeSignal({ reason: "No strong pole" });
  // Flag: son 8 mum dar konsolidasyon (hafif aşağı/yatay)
  const flag = c.slice(-8);
  const flagH = Math.max(...flag.map((x) => x.high)), flagL = Math.min(...flag.map((x) => x.low));
  if ((flagH - flagL) > a[i] * 4) return makeSignal({ reason: "Flag too wide" });
  // Kırılım: flag üstüne çıkış
  if (cur.close > flagH * 0.999 && cur.close > cur.open) {
    const sl = flagL, height = poleEnd.close - poleStart.close;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.74, reason: "Bull flag breakout" });
  }
  return makeSignal({ reason: "Bull flag forming" });
}

// 8. Rectangle / Range breakout
export function rectangle(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const { highs, lows } = pivots(c, 4);
  if (highs.length < 2 || lows.length < 2) return makeSignal({ reason: "Not enough pivots" });
  const recentH = highs.slice(-2), recentL = lows.slice(-2);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  const resistance = recentH.reduce((s, h) => s + h.price, 0) / recentH.length;
  const support = recentL.reduce((s, l) => s + l.price, 0) / recentL.length;
  // Tepeler ve dipler düz (rectangle)
  const flatRes = Math.abs(recentH[0].price - recentH[1].price) / resistance < 0.015;
  const flatSup = Math.abs(recentL[0].price - recentL[1].price) / support < 0.015;
  if (!flatRes || !flatSup) return makeSignal({ reason: "No rectangle" });
  const height = resistance - support;
  if (cur.close > resistance && c[i - 1].close <= resistance) {
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: resistance - height * 0.5, take_profit: [cur.close + height * 0.5, cur.close + height, cur.close + height * 1.5], confidence: 0.71, reason: "Rectangle breakout up" });
  }
  if (cur.close < support && c[i - 1].close >= support) {
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: support + height * 0.5, take_profit: [cur.close - height * 0.5, cur.close - height, cur.close - height * 1.5], confidence: 0.71, reason: "Rectangle breakdown down" });
  }
  return makeSignal({ reason: "Price inside rectangle" });
}
