import { Candle, Signal, makeSignal, ema, sma, rsi, macd, atr, bollingerBands, vwap, swingHighs, swingLows } from "../indicators";

function calcAdx(c: Candle[], p = 14): number[] {
  const res: number[] = new Array(c.length).fill(NaN);
  if (c.length < p * 2) return res;
  const pdm = [0], mdm = [0], trs = [c[0].high - c[0].low];
  for (let i = 1; i < c.length; i++) {
    const up = c[i].high - c[i - 1].high, dn = c[i - 1].low - c[i].low;
    pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0);
    trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  }
  let sp = pdm.slice(1, p + 1).reduce((a, b) => a + b, 0), sm = mdm.slice(1, p + 1).reduce((a, b) => a + b, 0), st = trs.slice(1, p + 1).reduce((a, b) => a + b, 0);
  const dx: number[] = [];
  for (let i = p; i < c.length; i++) {
    if (i > p) { sp = sp - sp / p + pdm[i]; sm = sm - sm / p + mdm[i]; st = st - st / p + trs[i]; }
    const pdi = 100 * (sp / (st || 1e-10)), mdi = 100 * (sm / (st || 1e-10));
    dx.push(100 * (Math.abs(pdi - mdi) / ((pdi + mdi) || 1e-10)));
  }
  for (let i = 0; i < dx.length; i++) { if (i < p - 1) continue; res[i + p] = dx.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p; }
  return res;
}
function calcSt(c: Candle[], p = 10, m = 3) {
  const a = atr(c, p), st: number[] = new Array(c.length).fill(NaN), dir: number[] = new Array(c.length).fill(0);
  for (let i = 0; i < c.length; i++) {
    const hl2 = (c[i].high + c[i].low) / 2, ub = hl2 + m * a[i], lb = hl2 - m * a[i];
    if (i === 0) { st[i] = ub; dir[i] = -1; continue; }
    if (c[i - 1].close > st[i - 1]) { st[i] = Math.max(lb, st[i - 1]); if (c[i].close < st[i]) { st[i] = ub; dir[i] = -1; } else dir[i] = 1; }
    else { st[i] = Math.min(ub, st[i - 1]); if (c[i].close > st[i]) { st[i] = lb; dir[i] = 1; } else dir[i] = -1; }
  }
  return { st, dir };
}

export function parabolicSar(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const af0 = 0.02, afMax = 0.2, afStep = 0.02;
  const sar: number[] = [], dir: number[] = [];
  let trend = c[1].close > c[0].close ? 1 : -1;
  let ep = trend === 1 ? c[1].high : c[1].low;
  let af = af0;
  let sarVal = trend === 1 ? c[0].low : c[0].high;
  sar.push(sarVal); dir.push(trend); sar.push(sarVal); dir.push(trend);
  for (let i = 2; i < c.length; i++) {
    sarVal = sarVal + af * (ep - sarVal);
    if (trend === 1) {
      if (c[i].low < sarVal) { trend = -1; sarVal = ep; ep = c[i].low; af = af0; }
      else if (c[i].high > ep) { ep = c[i].high; af = Math.min(af + afStep, afMax); }
    } else {
      if (c[i].high > sarVal) { trend = 1; sarVal = ep; ep = c[i].high; af = af0; }
      else if (c[i].low < ep) { ep = c[i].low; af = Math.min(af + afStep, afMax); }
    }
    sar.push(sarVal); dir.push(trend);
  }
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (dir[i] === 1 && dir[i - 1] === -1) {
    const r = cur.close - sar[i]; if (r <= 0) return makeSignal({ reason: "Invalid risk" });
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sar[i], take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "Parabolic SAR up flip" });
  }
  if (dir[i] === -1 && dir[i - 1] === 1) {
    const r = sar[i] - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" });
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sar[i], take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "Parabolic SAR down flip" });
  }
  return makeSignal({ reason: "No SAR flip" });
}
