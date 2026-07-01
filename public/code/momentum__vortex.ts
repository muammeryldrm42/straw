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

export function vortex(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const vmPlus: number[] = [], vmMinus: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) {
    vmPlus.push(Math.abs(c[k].high - c[k - 1].low));
    vmMinus.push(Math.abs(c[k].low - c[k - 1].high));
    tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close)));
  }
  const sum = (arr: number[], end: number) => arr.slice(end - p + 1, end + 1).reduce((a, b) => a + b, 0);
  const j = vmPlus.length - 1;
  const viP = sum(vmPlus, j) / sum(tr, j), viM = sum(vmMinus, j) / sum(tr, j);
  const viPprev = sum(vmPlus, j - 1) / sum(tr, j - 1), viMprev = sum(vmMinus, j - 1) / sum(tr, j - 1);
  const i = c.length - 1, a = atr(c, 14);
  if (viPprev <= viMprev && viP > viM) return mk(c, i, "long", a, 0.71, "Vortex VI+ crossed above VI-");
  if (viMprev <= viPprev && viM > viP) return mk(c, i, "short", a, 0.71, "Vortex VI- crossed above VI+");
  return makeSignal({ reason: "No vortex cross" });
}
