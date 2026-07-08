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

export function kst(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rocSma = (n: number, s: number) => {
    const r = closes.map((v, i) => (i >= n ? ((v - closes[i - n]) / closes[i - n]) * 100 : 0));
    return sma(r, s);
  };
  const k1 = rocSma(10, 10), k2 = rocSma(15, 10), k3 = rocSma(20, 10), k4 = rocSma(30, 15);
  const kstArr = k1.map((v, i) => v + 2 * k2[i] + 3 * k3[i] + 4 * k4[i]);
  const sig = sma(kstArr, 9);
  const i = c.length - 1, a = atr(c, 14);
  if (kstArr[i - 1] <= sig[i - 1] && kstArr[i] > sig[i]) return mk(c, i, "long", a, 0.71, "KST bullish cross");
  if (kstArr[i - 1] >= sig[i - 1] && kstArr[i] < sig[i]) return mk(c, i, "short", a, 0.71, "KST bearish cross");
  return makeSignal({ reason: "No KST cross" });
}
