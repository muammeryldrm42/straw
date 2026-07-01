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

export function trendMomentumCombo(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 50), r = rsi(closes, 14), roc = closes.map((v, k) => (k >= 12 ? ((v - closes[k - 12]) / closes[k - 12]) * 100 : 0)), i = c.length - 1, a = atr(c, 14);
  if (closes[i] > e[i] && r[i] > 50 && roc[i] > 0 && roc[i] > roc[i - 1]) return mkH(c, i, "long", a, 0.72, "Uptrend + RSI>50 + accelerating ROC");
  if (closes[i] < e[i] && r[i] < 50 && roc[i] < 0 && roc[i] < roc[i - 1]) return mkH(c, i, "short", a, 0.72, "Downtrend + RSI<50 + accelerating ROC");
  return makeSignal({ reason: "No trend+momentum alignment" });
}
