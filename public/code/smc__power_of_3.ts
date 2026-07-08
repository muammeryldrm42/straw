import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function powerOf3(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  // Son 24 mumu 3 faza böl: 8 mum accumulation, 8 mum manipulation, mevcut distribution başlangıcı
  const accum = c.slice(-24, -16);
  const manip = c.slice(-16, -8);
  const cur = c[c.length - 1];
  const a = atr(c, 14), ai = a.length - 1;
  // Accumulation: dar range
  const accH = Math.max(...accum.map((x) => x.high)), accL = Math.min(...accum.map((x) => x.low));
  const accRange = accH - accL;
  if (accRange > a[ai] * 4) return makeSignal({ reason: "No accumulation phase (range too wide)" });
  // Manipulation: range dışına wick at ama kapatma
  const manipBelowAcc = manip.some((x) => x.low < accL && x.close > accL);
  const manipAboveAcc = manip.some((x) => x.high > accH && x.close < accH);
  // Bullish PO3: manip aşağıya wick → distribution yukarı
  if (manipBelowAcc && cur.close > accH && cur.close > cur.open) {
    const slv = Math.min(...manip.map((x) => x.low)) - 0.3 * a[ai], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.81, reason: "PO3: Accum + downside manip + upside distribution" });
  }
  // Bearish PO3
  if (manipAboveAcc && cur.close < accL && cur.close < cur.open) {
    const slv = Math.max(...manip.map((x) => x.high)) + 0.3 * a[ai], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.81, reason: "PO3: Accum + upside manip + downside distribution" });
  }
  return makeSignal({ reason: "PO3 setup incomplete" });
}
