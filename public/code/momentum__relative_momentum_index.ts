import { Candle, Signal, makeSignal, sma, ema, rsi, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, slMult = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - slMult * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + slMult * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};
function stochKD(c: Candle[], kP: number, smooth: number, dP: number) {
  const raw: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (i < kP - 1) { raw.push(50); continue; }
    const win = c.slice(i - kP + 1, i + 1);
    const hh = Math.max(...win.map((x) => x.high)), ll = Math.min(...win.map((x) => x.low));
    raw.push(hh === ll ? 50 : ((c[i].close - ll) / (hh - ll)) * 100);
  }
  const k = sma(raw, smooth), d = sma(k, dP);
  return { k, d };
}
function macdLine(closes: number[], f: number, s: number) { const ef = ema(closes, f), es = ema(closes, s); return ef.map((v, i) => v - es[i]); }
function stochOf(arr: number[], p: number) {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < p - 1) { out.push(50); continue; }
    const win = arr.slice(i - p + 1, i + 1); const mn = Math.min(...win), mx = Math.max(...win);
    out.push(mx === mn ? 50 : ((arr[i] - mn) / (mx - mn)) * 100);
  }
  return out;
}

export function relativeMomentumIndex(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), p = 14, mom = 4;
  const up: number[] = [], dn: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < mom) { up.push(0); dn.push(0); continue; }
    const diff = closes[i] - closes[i - mom];
    up.push(diff > 0 ? diff : 0); dn.push(diff < 0 ? -diff : 0);
  }
  const upE = ema(up, p), dnE = ema(dn, p);
  const rmi = upE.map((v, i) => (v + dnE[i] === 0 ? 50 : (100 * v) / (v + dnE[i])));
  const i = c.length - 1, a = atr(c, 14);
  if (rmi[i - 1] < 30 && rmi[i] >= 30) return mk(c, i, "long", a, 0.69, `RMI exit oversold (${rmi[i].toFixed(0)})`);
  if (rmi[i - 1] > 70 && rmi[i] <= 70) return mk(c, i, "short", a, 0.69, `RMI exit overbought (${rmi[i].toFixed(0)})`);
  return makeSignal({ reason: `RMI ${rmi[i].toFixed(0)}` });
}
