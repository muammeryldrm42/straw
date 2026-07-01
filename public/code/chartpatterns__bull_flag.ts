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
