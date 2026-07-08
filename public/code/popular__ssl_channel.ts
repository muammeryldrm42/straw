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

export function sslChannel(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const smaHigh = sma(c.map((x) => x.high), 10), smaLow = sma(c.map((x) => x.low), 10), closes = c.map((x) => x.close);
  const hlv: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (closes[i] > smaHigh[i]) hlv.push(1);
    else if (closes[i] < smaLow[i]) hlv.push(-1);
    else hlv.push(i > 0 ? hlv[i - 1] : 1);
  }
  const sslDown = hlv.map((h, i) => (h < 0 ? smaHigh[i] : smaLow[i]));
  const sslUp = hlv.map((h, i) => (h < 0 ? smaLow[i] : smaHigh[i]));
  const i = c.length - 1, a = atr(c, 14);
  if (sslUp[i - 1] <= sslDown[i - 1] && sslUp[i] > sslDown[i]) return mk(c, i, "long", a, 0.72, "SSL Channel bullish cross");
  if (sslUp[i - 1] >= sslDown[i - 1] && sslUp[i] < sslDown[i]) return mk(c, i, "short", a, 0.72, "SSL Channel bearish cross");
  return makeSignal({ reason: "No SSL cross" });
}
