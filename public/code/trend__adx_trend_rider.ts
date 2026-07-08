import { Candle, Signal, makeSignal, ema, sma, macd, atr } from "../indicators";

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
