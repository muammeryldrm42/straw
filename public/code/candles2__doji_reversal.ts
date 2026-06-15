import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

function body(c: Candle) { return Math.abs(c.close - c.open); }
function range(c: Candle) { return c.high - c.low; }
function isGreen(c: Candle) { return c.close > c.open; }
function isRed(c: Candle) { return c.close < c.open; }

export function dojiReversal(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], prev = c[i - 1], a = atr(c, 14);
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  const rng = range(cur);
  if (rng === 0) return makeSignal({ reason: "Zero range" });
  // Doji: gövde range'in %10'undan küçük
  const isDoji = body(cur) < rng * 0.1;
  if (!isDoji) return makeSignal({ reason: "Not a doji" });
  // Oversold doji -> long beklentisi (teyit: sonraki mum yok, doji'nin konumu)
  if (rs[i] < 35) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.66, reason: `Doji at oversold (RSI ${rs[i].toFixed(0)})` });
  }
  if (rs[i] > 65) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.66, reason: `Doji at overbought (RSI ${rs[i].toFixed(0)})` });
  }
  return makeSignal({ reason: "Doji in mid-range (no edge)" });
}
