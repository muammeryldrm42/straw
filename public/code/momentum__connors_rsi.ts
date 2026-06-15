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

export function connorsRsi(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const r3 = rsi(closes, 3);
  // streak
  const streak: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) streak.push(streak[i - 1] > 0 ? streak[i - 1] + 1 : 1);
    else if (closes[i] < closes[i - 1]) streak.push(streak[i - 1] < 0 ? streak[i - 1] - 1 : -1);
    else streak.push(0);
  }
  const rStreak = rsi(streak, 2);
  const i = c.length - 1, a = atr(c, 14);
  const crsi = (r3[i] + rStreak[i] + 50) / 3; // simplified (percentrank≈50)
  if (crsi < 20) return mk(c, i, "long", a, 0.72, `Connors RSI oversold (${crsi.toFixed(0)})`);
  if (crsi > 80) return mk(c, i, "short", a, 0.72, `Connors RSI overbought (${crsi.toFixed(0)})`);
  return makeSignal({ reason: `Connors RSI ${crsi.toFixed(0)}` });
}
