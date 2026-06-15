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

export function tripleScreen(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), eLong = ema(closes, 50), m = macd(closes), k = stochK(c), i = c.length - 1, a = atr(c, 14);
  const trendUp = eLong[i] > eLong[i - 5], trendDn = eLong[i] < eLong[i - 5];
  // Screen1: trend, Screen2: oscillator oversold/overbought against trend, Screen3: entry
  if (trendUp && k[i] < 35 && m.histogram[i] > m.histogram[i - 1]) return mkH(c, i, "long", a, 0.74, "Triple Screen: uptrend + oversold pullback + momentum");
  if (trendDn && k[i] > 65 && m.histogram[i] < m.histogram[i - 1]) return mkH(c, i, "short", a, 0.74, "Triple Screen: downtrend + overbought bounce + momentum");
  return makeSignal({ reason: "Triple Screen not aligned" });
}
