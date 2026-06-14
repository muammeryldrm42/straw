import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function breakerBlock(c: Candle[]): Signal {
  if (c.length < 220) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14), e = ema(closes, 200);
  const cur = c[c.length - 1], price = cur.close;
  const trend = price > e[e.length - 1] ? "up" : "down";
  const start = Math.max(3, c.length - 80);
  for (let i = start; i < c.length - 3; i++) {
    const ai = a[i]; if (isNaN(ai)) continue;
    const cc = c[i], nx = c[i + 1];
    // bullish OB
    if (cc.close < cc.open && nx.high - cc.low >= ai * 1.2 && nx.close > cc.high) {
      const post = c.slice(i + 2);
      if (post.some((x) => x.close < cc.low) && cur.high >= cc.low && cur.low <= cc.high && trend === "down") {
        const entry = (cc.high + cc.low) / 2, slv = cc.high + 0.5 * a[a.length - 1], r = slv - entry;
        return makeSignal({ signal: "short", entry, stop_loss: slv, take_profit: [entry - r * 2, entry - r * 3, entry - r * 5], confidence: 0.74, reason: "Bearish breaker" });
      }
    }
    if (cc.close > cc.open && cc.high - nx.low >= ai * 1.2 && nx.close < cc.low) {
      const post = c.slice(i + 2);
      if (post.some((x) => x.close > cc.high) && cur.high >= cc.low && cur.low <= cc.high && trend === "up") {
        const entry = (cc.high + cc.low) / 2, slv = cc.low - 0.5 * a[a.length - 1], r = entry - slv;
        return makeSignal({ signal: "long", entry, stop_loss: slv, take_profit: [entry + r * 2, entry + r * 3, entry + r * 5], confidence: 0.74, reason: "Bullish breaker" });
      }
    }
  }
  return makeSignal({ reason: "Breaker kurulumu yok" });
}
