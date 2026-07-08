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
