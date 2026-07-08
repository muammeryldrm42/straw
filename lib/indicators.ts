// Strategy DEX - shared technical indicators and types
// Tüm stratejiler ve kullanıcı kodu bu fonksiyonlara erişir.

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  signal: "long" | "short" | "neutral";
  entry: number;
  stop_loss: number;
  take_profit: number[];
  confidence: number;
  reason: string;
}

export function makeSignal(p: Partial<Signal> = {}): Signal {
  return {
    signal: p.signal ?? "neutral",
    entry: p.entry ?? 0,
    stop_loss: p.stop_loss ?? 0,
    take_profit: p.take_profit ?? [],
    confidence: p.confidence ?? 0,
    reason: p.reason ?? "",
  };
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  out.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(NaN); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  let ag = gain / period, al = loss / period;
  out[period] = 100 - 100 / (1 + ag / (al || 1e-10));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = 100 - 100 / (1 + ag / (al || 1e-10));
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signalP = 9) {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const macdLine = ef.map((v, i) => v - es[i]);
  const signalLine = ema(macdLine, signalP);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

export function atr(candles: Candle[], period = 14): number[] {
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { trs.push(candles[i].high - candles[i].low); continue; }
    trs.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  return sma(trs, period);
}

export function bollingerBands(closes: number[], period = 20, stdDev = 2) {
  const middle = sma(closes, period);
  const upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + sd * stdDev);
    lower.push(mean - sd * stdDev);
  }
  return { upper, middle, lower };
}

export function vwap(candles: Candle[]): number[] {
  let pv = 0, vv = 0;
  return candles.map((c) => {
    const t = (c.high + c.low + c.close) / 3;
    pv += t * c.volume; vv += c.volume;
    return vv ? pv / vv : t;
  });
}

export function swingHighs(candles: Candle[], lb = 5): (number | null)[] {
  return candles.map((c, i) => {
    if (i < lb || i >= candles.length - lb) return null;
    const w = candles.slice(i - lb, i + lb + 1);
    return c.high === Math.max(...w.map((x) => x.high)) ? c.high : null;
  });
}

export function swingLows(candles: Candle[], lb = 5): (number | null)[] {
  return candles.map((c, i) => {
    if (i < lb || i >= candles.length - lb) return null;
    const w = candles.slice(i - lb, i + lb + 1);
    return c.low === Math.min(...w.map((x) => x.low)) ? c.low : null;
  });
}
