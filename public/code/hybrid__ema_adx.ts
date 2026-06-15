import { Candle, Signal, makeSignal, sma, ema, rsi, macd, atr, bollingerBands } from "../indicators";

const mkH = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function stochK(c: Candle[], p = 14) {
  const out: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i < p - 1) { out.push(50); continue; }
    const w = c.slice(i - p + 1, i + 1), hh = Math.max(...w.map((x) => x.high)), ll = Math.min(...w.map((x) => x.low));
    out.push(hh === ll ? 50 : ((c[i].close - ll) / (hh - ll)) * 100);
  }
  return sma(out, 3);
}

export function emaAdx(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e1 = ema(closes, 9), e2 = ema(closes, 21), i = c.length - 1, a = atr(c, 14);
  // ADX proxy
  const p = 14, pdm: number[] = [], mdm: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) { const up = c[k].high - c[k - 1].high, dn = c[k - 1].low - c[k].low; pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0); tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close))); }
  const trS = ema(tr, p), pdi = ema(pdm, p).map((v, k) => (trS[k] ? (100 * v) / trS[k] : 0)), mdi = ema(mdm, p).map((v, k) => (trS[k] ? (100 * v) / trS[k] : 0));
  const dx = pdi.map((v, k) => (v + mdi[k] ? (100 * Math.abs(v - mdi[k])) / (v + mdi[k]) : 0)), adx = ema(dx, p);
  const j = adx.length - 1;
  if (e1[i - 1] <= e2[i - 1] && e1[i] > e2[i] && adx[j] > 25) return mkH(c, i, "long", a, 0.74, `EMA cross up + ADX strong (${adx[j].toFixed(0)})`);
  if (e1[i - 1] >= e2[i - 1] && e1[i] < e2[i] && adx[j] > 25) return mkH(c, i, "short", a, 0.74, `EMA cross down + ADX strong (${adx[j].toFixed(0)})`);
  return makeSignal({ reason: "No EMA+ADX trend signal" });
}
