import { Candle, Signal, makeSignal, sma, atr } from "../indicators";

// Volume Surge - fiyat/hacim bazlı, demo trade'de çalışır
export function volumeSurge(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const vols = c.map((x) => x.volume), i = c.length - 1, cur = c[i];
  const avgV = sma(vols.slice(0, -1), 20)[vols.length - 2];
  const mult = cur.volume / (avgV || 1);
  if (mult < 3) return makeSignal({ reason: `Surge yok (${mult.toFixed(2)}x)` });
  if (cur.close <= cur.open) return makeSignal({ reason: "Volume on red candle — skip" });
  const a = atr(c, 14), sl = cur.close - a[i] * 1.5, r = cur.close - sl;
  const conf = Math.min(0.5 + (mult - 3) * 0.05 + 0.2, 0.95);
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3.5, cur.close + r * 5], confidence: conf, reason: `Volume surge ${mult.toFixed(1)}x, yeşil mum` });
}

// Tiered Exit - momentum entry (EMA cross), tiered TP demo motoru pozisyon yönetiminde uygular
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

// 3. Whale Buy - tek mumda dev hacim + büyük yeşil mum + yüksek kapanış
export function whaleBuy(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i];
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  const mult = cur.volume / (avgV || 1);
  if (mult < 5) return makeSignal({ reason: `No whale volume (${mult.toFixed(1)}x)` });
  if (cur.close <= cur.open) return makeSignal({ reason: "Red candle — whale could be selling" });
  // Mum gövdesi range'in %70+'ında ve kapanış üst %25'te
  const range = cur.high - cur.low;
  const body = Math.abs(cur.close - cur.open);
  if (body / range < 0.7) return makeSignal({ reason: "Candle body too weak" });
  const closePos = (cur.close - cur.low) / range;
  if (closePos < 0.75) return makeSignal({ reason: "Close not in upper portion" });
  const a = atr(c, 14), sl = cur.close - a[i] * 1.2, r = cur.close - sl;
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 4, cur.close + r * 6], confidence: 0.78, reason: `🐋 Whale buy ${mult.toFixed(1)}x volume, strong body` });
}

// 4. Pump Cascade - 5+ ardışık yeşil mum, momentum güçleniyor
export function pumpCascade(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const last7 = c.slice(-7);
  const greens = last7.filter((x) => x.close > x.open).length;
  if (greens < 5) return makeSignal({ reason: `No cascade (${greens}/7 green)` });
  // Mum boyları artıyor mu?
  const sizes = last7.map((x) => Math.abs(x.close - x.open));
  const firstHalf = sizes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const secondHalf = sizes.slice(-3).reduce((a, b) => a + b, 0) / 3;
  if (secondHalf < firstHalf * 1.1) return makeSignal({ reason: "Momentum weakening" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // Geç giriş riski - hızlı SL, kademeli TP
  const sl = cur.close - a[i] * 1.5, r = cur.close - sl;
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3.5], confidence: 0.65, reason: `🚀 Pump cascade ${greens}/7 green, momentum rising` });
}
