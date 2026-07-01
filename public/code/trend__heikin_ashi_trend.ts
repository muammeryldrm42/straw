import { Candle, Signal, makeSignal, ema, sma, macd, atr } from "../indicators";

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
