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

// 1. RSI + Bollinger
export function rsiBb(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), r = rsi(closes, 14), bb = bollingerBands(closes, 20, 2), i = c.length - 1, a = atr(c, 14);
  if (r[i] < 35 && closes[i] <= bb.lower[i]) return mkH(c, i, "long", a, 0.73, "RSI oversold + price at lower Bollinger");
  if (r[i] > 65 && closes[i] >= bb.upper[i]) return mkH(c, i, "short", a, 0.73, "RSI overbought + price at upper Bollinger");
  return makeSignal({ reason: "No RSI+BB confluence" });
}

// 2. MACD + RSI
export function macdRsi(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), m = macd(closes), r = rsi(closes, 14), i = c.length - 1, a = atr(c, 14);
  const crossUp = m.macd[i - 1] <= m.signal[i - 1] && m.macd[i] > m.signal[i];
  const crossDn = m.macd[i - 1] >= m.signal[i - 1] && m.macd[i] < m.signal[i];
  if (crossUp && r[i] > 50) return mkH(c, i, "long", a, 0.73, "MACD bullish cross + RSI > 50");
  if (crossDn && r[i] < 50) return mkH(c, i, "short", a, 0.73, "MACD bearish cross + RSI < 50");
  return makeSignal({ reason: "No MACD+RSI confluence" });
}

// 3. EMA + ADX (trend + strength)
export function emaAdx(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e1 = ema(closes, 9), e2 = ema(closes, 21), i = c.length - 1, a = atr(c, 14);
  // ADX proxy
  const p = 14, pdm: number[] = [], mdm: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) { const up = c[k].high - c[k - 1].high, dn = c[k - 1].low - c[k].low; pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0); tr.push(Math.max(c[k].high - c[k].low, Math.abs(c[k].high - c[k - 1].close), Math.abs(c[k].low - c[k - 1].close))); }
  const trS = ema(tr, p), pdi = ema(pdm, p).map((v, k) => (trS[k] ? (100 * v) / trS[k] : 0)), mdi = ema(mdm, p).map((v, k) => (trS[k] ? (100 * v) / trS[k] : 0));
  const dx = pdi.map((v, k) => (v + mdi[k] ? (100 * Math.abs(v - mdi[k])) / (v + mdi[k]) : 0)), adx = ema(dx, p);
  const j = adx.length - 1;
  if (e1[i - 1] <= e2[i - 1] && e1[i] > e2[i] && adx[j] > 25) return mkH(c, i, "long", a, 0.74, `EMA cross up + ADX strong (${adx[j].toFixed(0)})`);
  if (e1[i - 1] >= e2[i - 1] && e1[i] < e2[i] && adx[j] > 25) return mkH(c, i, "short", a, 0.74, `EMA cross down + ADX strong (${adx[j].toFixed(0)})`);
  return makeSignal({ reason: "No EMA+ADX trend signal" });
}

// 4. Stochastic + MACD
export function stochMacd(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), k = stochK(c), m = macd(closes), i = c.length - 1, a = atr(c, 14);
  if (k[i] < 25 && m.histogram[i] > m.histogram[i - 1]) return mkH(c, i, "long", a, 0.72, "Stochastic oversold + MACD histogram rising");
  if (k[i] > 75 && m.histogram[i] < m.histogram[i - 1]) return mkH(c, i, "short", a, 0.72, "Stochastic overbought + MACD histogram falling");
  return makeSignal({ reason: "No Stoch+MACD confluence" });
}

// 5. Triple Screen (Elder)
export function tripleScreen(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), eLong = ema(closes, 50), m = macd(closes), k = stochK(c), i = c.length - 1, a = atr(c, 14);
  const trendUp = eLong[i] > eLong[i - 5], trendDn = eLong[i] < eLong[i - 5];
  // Screen1: trend, Screen2: oscillator oversold/overbought against trend, Screen3: entry
  if (trendUp && k[i] < 35 && m.histogram[i] > m.histogram[i - 1]) return mkH(c, i, "long", a, 0.74, "Triple Screen: uptrend + oversold pullback + momentum");
  if (trendDn && k[i] > 65 && m.histogram[i] < m.histogram[i - 1]) return mkH(c, i, "short", a, 0.74, "Triple Screen: downtrend + overbought bounce + momentum");
  return makeSignal({ reason: "Triple Screen not aligned" });
}

// 6. BB + RSI + Stochastic (triple oscillator)
export function bbRsiStoch(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), bb = bollingerBands(closes, 20, 2), r = rsi(closes, 14), k = stochK(c), i = c.length - 1, a = atr(c, 14);
  if (closes[i] <= bb.lower[i] && r[i] < 35 && k[i] < 25) return mkH(c, i, "long", a, 0.75, "Triple oversold: BB lower + RSI + Stochastic");
  if (closes[i] >= bb.upper[i] && r[i] > 65 && k[i] > 75) return mkH(c, i, "short", a, 0.75, "Triple overbought: BB upper + RSI + Stochastic");
  return makeSignal({ reason: "No triple-oscillator confluence" });
}

// 7. Trend + Momentum combo
export function trendMomentumCombo(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 50), r = rsi(closes, 14), roc = closes.map((v, k) => (k >= 12 ? ((v - closes[k - 12]) / closes[k - 12]) * 100 : 0)), i = c.length - 1, a = atr(c, 14);
  if (closes[i] > e[i] && r[i] > 50 && roc[i] > 0 && roc[i] > roc[i - 1]) return mkH(c, i, "long", a, 0.72, "Uptrend + RSI>50 + accelerating ROC");
  if (closes[i] < e[i] && r[i] < 50 && roc[i] < 0 && roc[i] < roc[i - 1]) return mkH(c, i, "short", a, 0.72, "Downtrend + RSI<50 + accelerating ROC");
  return makeSignal({ reason: "No trend+momentum alignment" });
}

// 8. Volume + Price confluence
export function volumePrice(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), e = ema(closes, 20), i = c.length - 1, a = atr(c, 14);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20, cur = c[i];
  if (cur.close > e[i] && cur.close > cur.open && cur.volume > avgV * 1.5 && cur.close > c[i - 1].high) return mkH(c, i, "long", a, 0.72, "Breakout candle + 1.5x volume + above EMA");
  if (cur.close < e[i] && cur.close < cur.open && cur.volume > avgV * 1.5 && cur.close < c[i - 1].low) return mkH(c, i, "short", a, 0.72, "Breakdown candle + 1.5x volume + below EMA");
  return makeSignal({ reason: "No volume+price confluence" });
}

// 9. MA + RSI + Volume (3-factor)
export function maRsiVol(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), fast = sma(closes, 10), slow = sma(closes, 30), r = rsi(closes, 14), i = c.length - 1, a = atr(c, 14);
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  const crossUp = fast[i - 1] <= slow[i - 1] && fast[i] > slow[i], crossDn = fast[i - 1] >= slow[i - 1] && fast[i] < slow[i];
  if (crossUp && r[i] > 50 && c[i].volume > avgV) return mkH(c, i, "long", a, 0.73, "MA cross up + RSI>50 + volume");
  if (crossDn && r[i] < 50 && c[i].volume > avgV) return mkH(c, i, "short", a, 0.73, "MA cross down + RSI<50 + volume");
  return makeSignal({ reason: "No 3-factor confluence" });
}

// 10. Confluence Score (weighted multi-indicator)
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

// 11. Multi-Timeframe proxy (fast vs slow alignment)
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

// 12. Adaptive Combo (volatility-adjusted switching)
export function adaptiveCombo(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close), a = atr(c, 14), i = c.length - 1;
  // Volatilite yüksekse trend (EMA), düşükse mean-reversion (RSI)
  const atrPct = a[i] / closes[i], avgAtrPct = a.slice(i - 20, i).reduce((s, v, k) => s + v / closes[i - 20 + k], 0) / 20;
  const e = ema(closes, 21), r = rsi(closes, 14);
  if (atrPct > avgAtrPct) {
    // trend modu
    if (closes[i - 1] <= e[i - 1] && closes[i] > e[i]) return mkH(c, i, "long", a, 0.7, "Adaptive (high vol): trend long");
    if (closes[i - 1] >= e[i - 1] && closes[i] < e[i]) return mkH(c, i, "short", a, 0.7, "Adaptive (high vol): trend short");
  } else {
    // mean reversion modu
    if (r[i] < 30) return mkH(c, i, "long", a, 0.7, "Adaptive (low vol): mean-reversion long");
    if (r[i] > 70) return mkH(c, i, "short", a, 0.7, "Adaptive (low vol): mean-reversion short");
  }
  return makeSignal({ reason: "Adaptive combo: no signal" });
}
