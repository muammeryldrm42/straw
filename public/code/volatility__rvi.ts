import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function rvi(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 10;
  const closes = c.map((x) => x.close);
  const std: number[] = [];
  for (let k = 0; k < closes.length; k++) {
    if (k < p) { std.push(0); continue; }
    const win = closes.slice(k - p + 1, k + 1);
    const m = win.reduce((a, b) => a + b, 0) / p;
    std.push(Math.sqrt(win.reduce((s, v) => s + (v - m) ** 2, 0) / p));
  }
  const up: number[] = [0], down: number[] = [0];
  for (let k = 1; k < closes.length; k++) {
    up.push(closes[k] > closes[k - 1] ? std[k] : 0);
    down.push(closes[k] < closes[k - 1] ? std[k] : 0);
  }
  const upEma = ema(up, 14), downEma = ema(down, 14);
  const rviCalc = (idx: number) => (upEma[idx] + downEma[idx] === 0 ? 50 : (100 * upEma[idx]) / (upEma[idx] + downEma[idx]));
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = rviCalc(i), prev = rviCalc(i - 1);
  if (prev < 50 && now >= 50) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: `RVI crossed above 50 (${now.toFixed(0)})` });
  }
  if (prev > 50 && now <= 50) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: `RVI crossed below 50 (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `RVI ${now.toFixed(0)}` });
}
