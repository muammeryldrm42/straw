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

export function confluenceScore(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 50), r = rsi(closes, 14), m = macd(closes), k = stochK(c), bb = bollingerBands(closes, 20, 2), i = c.length - 1, a = atr(c, 14);
  let score = 0;
  if (closes[i] > e[i]) score++; else score--;
  if (r[i] > 50) score++; else score--;
  if (m.histogram[i] > 0) score++; else score--;
  if (k[i] > 50) score++; else score--;
  if (closes[i] > bb.middle[i]) score++; else score--;
  if (score >= 4) return mkH(c, i, "long", a, 0.72, `Bullish confluence score ${score}/5`);
  if (score <= -4) return mkH(c, i, "short", a, 0.72, `Bearish confluence score ${score}/5`);
  return makeSignal({ reason: `Confluence score ${score} (mixed)` });
}
