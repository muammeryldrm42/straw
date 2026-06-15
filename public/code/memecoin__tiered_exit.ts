import { Candle, Signal, makeSignal, sma, atr } from "../indicators";

export function tieredExit(c: Candle[]): Signal {
  if (c.length < 25) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const ef: number[] = [], es: number[] = [];
  const k9 = 2 / 10, k21 = 2 / 22;
  let p9 = closes[0], p21 = closes[0];
  for (let i = 0; i < closes.length; i++) { p9 = i === 0 ? closes[0] : closes[i] * k9 + p9 * (1 - k9); p21 = i === 0 ? closes[0] : closes[i] * k21 + p21 * (1 - k21); ef.push(p9); es.push(p21); }
  const i = c.length - 1, cur = c[i];
  if (ef[i] > es[i] && ef[i - 1] <= es[i - 1]) {
    const sl = cur.close * 0.75, r = cur.close - sl;
    // tiered: +50% / +150% / +300%
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close * 1.5, cur.close * 2.5, cur.close * 4], confidence: 0.7, reason: "EMA cross momentum (kademeli TP: +50/+150/+300%)" });
  }
  return makeSignal({ reason: "No momentum entry" });
}
