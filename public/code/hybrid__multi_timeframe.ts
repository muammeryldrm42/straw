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

export function multiTimeframe(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), htf = ema(closes, 50), ltf = ema(closes, 12), i = c.length - 1, a = atr(c, 14);
  const htfUp = htf[i] > htf[i - 3], htfDn = htf[i] < htf[i - 3];
  const ltfCrossUp = closes[i - 1] <= ltf[i - 1] && closes[i] > ltf[i];
  const ltfCrossDn = closes[i - 1] >= ltf[i - 1] && closes[i] < ltf[i];
  if (htfUp && ltfCrossUp) return mkH(c, i, "long", a, 0.73, "HTF uptrend + LTF pullback entry");
  if (htfDn && ltfCrossDn) return mkH(c, i, "short", a, 0.73, "HTF downtrend + LTF bounce entry");
  return makeSignal({ reason: "Timeframes not aligned" });
}
