import { Candle, Signal, makeSignal, sma, atr, swingHighs, swingLows } from "../indicators";

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
