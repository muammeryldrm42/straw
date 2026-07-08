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

export function adaptiveCombo(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), a = atr(c, 14), i = c.length - 1;
  // Volatilite yüksekse trend (EMA), düşükse mean-reversion (RSI)
  const atrPct = a[i] / closes[i], avgAtrPct = a.slice(i - 20, i).reduce((s, v, k) => s + v / closes[i - 20 + k], 0) / 20;
  const e = ema(closes, 21), r = rsi(closes, 14);
  if (atrPct > avgAtrPct) {
    // trend modu
    if (closes[i - 1] <= e[i - 1] && closes[i] > e[i]) return mkH(c, i, "long", a, 0.7, "Adaptive (high vol): trend long");
    if (closes[i - 1] >= e[i - 1] && closes[i] < e[i]) return mkH(c, i, "short", a, 0.7, "Adaptive (high vol): trend short");
  } else {
    // mean reversion modu
    if (r[i] < 30) return mkH(c, i, "long", a, 0.7, "Adaptive (low vol): mean-reversion long");
    if (r[i] > 70) return mkH(c, i, "short", a, 0.7, "Adaptive (low vol): mean-reversion short");
  }
  return makeSignal({ reason: "Adaptive combo: no signal" });
}
