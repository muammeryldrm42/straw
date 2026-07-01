import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function easeOfMovement(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const eom: number[] = [0];
  for (let k = 1; k < c.length; k++) {
    const dm = (c[k].high + c[k].low) / 2 - (c[k - 1].high + c[k - 1].low) / 2;
    const boxRatio = c[k].volume / 1e6 / ((c[k].high - c[k].low) || 1e-9);
    eom.push(boxRatio === 0 ? 0 : dm / boxRatio);
  }
  const eomSma = sma(eom, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (eomSma[i - 1] <= 0 && eomSma[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: "Ease of Movement turned positive" });
  }
  if (eomSma[i - 1] >= 0 && eomSma[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: "Ease of Movement turned negative" });
  }
  return makeSignal({ reason: "EOM neutral" });
}
