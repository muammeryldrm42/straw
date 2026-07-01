import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function ote(c: Candle[]): Signal {
  if (c.length < 220) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14), e = ema(closes, 200);
  const cur = c[c.length - 1], price = cur.close;
  const trend = price > e[e.length - 1] ? "up" : "down";
  const sh = swingHighs(c, 10), sl = swingLows(c, 10);
  let shi = -1, sli = -1, lastH = NaN, lastL = NaN;
  for (let i = sh.length - 1; i >= 0; i--) {
    if (sh[i] !== null && shi === -1) { shi = i; lastH = sh[i] as number; }
    if (sl[i] !== null && sli === -1) { sli = i; lastL = sl[i] as number; }
    if (shi !== -1 && sli !== -1) break;
  }
  if (isNaN(lastH) || isNaN(lastL)) return makeSignal({ reason: "No swing structure" });
  if (shi > sli) {
    const lo = lastH - (lastH - lastL) * 0.79, hi = lastH - (lastH - lastL) * 0.62;
    if (price >= lo && price <= hi && trend === "up") {
      const entry = (lo + hi) / 2, slv = lastL - 0.3 * a[a.length - 1], r = entry - slv;
      return makeSignal({ signal: "long", entry, stop_loss: slv, take_profit: [entry + r * 2, entry + r * 3, lastH], confidence: 0.77, reason: "OTE long (0.62-0.79 fib)" });
    }
  } else {
    const lo = lastL + (lastH - lastL) * 0.62, hi = lastL + (lastH - lastL) * 0.79;
    if (price >= lo && price <= hi && trend === "down") {
      const entry = (lo + hi) / 2, slv = lastH + 0.3 * a[a.length - 1], r = slv - entry;
      return makeSignal({ signal: "short", entry, stop_loss: slv, take_profit: [entry - r * 2, entry - r * 3, lastL], confidence: 0.77, reason: "OTE short (0.62-0.79 fib)" });
    }
  }
  return makeSignal({ reason: "Price not in OTE zone" });
}
