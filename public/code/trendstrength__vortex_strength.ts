import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function aroonCalc(c: Candle[], end: number, p: number) {
  const win = c.slice(end - p, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < win.length; k++) { if (win[k].high >= win[hiIdx].high) hiIdx = k; if (win[k].low <= win[loIdx].low) loIdx = k; }
  const up = ((p - (p - hiIdx)) / p) * 100, dn = ((p - (p - loIdx)) / p) * 100;
  return { up, dn };
}

export function vortexStrength(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14, vmP: number[] = [], vmM: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) { vmP.push(Math.abs(c[k].high - c[k - 1].low)); vmM.push(Math.abs(c[k].low - c[k - 1].high)); tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close))); }
  const sum = (arr: number[], e: number) => arr.slice(e - p + 1, e + 1).reduce((a, b) => a + b, 0);
  const j = vmP.length - 1, viP = sum(vmP, j) / sum(tr, j), viM = sum(vmM, j) / sum(tr, j);
  const i = c.length - 1, a = atr(c, 14);
  if (viP > 1.1 && viP > viM) return mk(c, i, "long", a, 0.7, `Strong vortex uptrend (VI+ ${viP.toFixed(2)})`);
  if (viM > 1.1 && viM > viP) return mk(c, i, "short", a, 0.7, `Strong vortex downtrend (VI- ${viM.toFixed(2)})`);
  return makeSignal({ reason: "Weak vortex trend" });
}
