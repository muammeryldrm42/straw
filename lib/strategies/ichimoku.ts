import { Candle, Signal, makeSignal, atr } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", a: number[], conf: number, reason: string, m = 2): Signal => {
  const cur = c[i];
  if (side === "long") { const sl = cur.close - m * a[i], r = cur.close - sl; return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const sl = cur.close + m * a[i], r = sl - cur.close; return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

function ichi(c: Candle[], end: number) {
  const hh = (n: number) => Math.max(...c.slice(end - n + 1, end + 1).map((x) => x.high));
  const ll = (n: number) => Math.min(...c.slice(end - n + 1, end + 1).map((x) => x.low));
  const tenkan = (hh(9) + ll(9)) / 2;
  const kijun = (hh(26) + ll(26)) / 2;
  const spanA = (tenkan + kijun) / 2;
  const spanB = (hh(52) + ll(52)) / 2;
  return { tenkan, kijun, spanA, spanB };
}
// Şu anki bulut = 26 bar önce hesaplanan span A/B
function cloud(c: Candle[], i: number) {
  const past = ichi(c, i - 26);
  return { top: Math.max(past.spanA, past.spanB), bot: Math.min(past.spanA, past.spanB), spanA: past.spanA, spanB: past.spanB };
}

// 1. Tenkan/Kijun Cross
export function tenkanKijunCross(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), prev = ichi(c, i - 1);
  if (prev.tenkan <= prev.kijun && now.tenkan > now.kijun) return mk(c, i, "long", a, 0.72, "Tenkan crossed above Kijun");
  if (prev.tenkan >= prev.kijun && now.tenkan < now.kijun) return mk(c, i, "short", a, 0.72, "Tenkan crossed below Kijun");
  return makeSignal({ reason: "No TK cross" });
}

// 2. Kumo (Cloud) Breakout
export function kumoBreakout(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cl = cloud(c, i), clPrev = cloud(c, i - 1);
  if (c[i - 1].close <= clPrev.top && c[i].close > cl.top) return mk(c, i, "long", a, 0.73, "Price broke above the Kumo cloud");
  if (c[i - 1].close >= clPrev.bot && c[i].close < cl.bot) return mk(c, i, "short", a, 0.73, "Price broke below the Kumo cloud");
  return makeSignal({ reason: "Price inside/within cloud" });
}

// 3. Chikou Span confirmation
export function chikouConfirm(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Chikou = şu anki close, 26 bar geriye; geçmiş fiyatı yukarı/aşağı kesişi
  const chikouNow = c[i].close, pastPrice = c[i - 26].close, pastPricePrev = c[i - 27].close, chikouPrev = c[i - 1].close;
  if (chikouPrev <= pastPricePrev && chikouNow > pastPrice) return mk(c, i, "long", a, 0.7, "Chikou span crossed above past price");
  if (chikouPrev >= pastPricePrev && chikouNow < pastPrice) return mk(c, i, "short", a, 0.7, "Chikou span crossed below past price");
  return makeSignal({ reason: "No Chikou cross" });
}

// 4. Senkou (cloud) twist
export function senkouTwist(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), prev = ichi(c, i - 1);
  // Span A/B kesişimi = bulut rengi değişimi (gelecek trend sinyali)
  if (prev.spanA <= prev.spanB && now.spanA > now.spanB && c[i].close > now.kijun) return mk(c, i, "long", a, 0.69, "Cloud twist bullish (Span A above Span B)");
  if (prev.spanA >= prev.spanB && now.spanA < now.spanB && c[i].close < now.kijun) return mk(c, i, "short", a, 0.69, "Cloud twist bearish (Span A below Span B)");
  return makeSignal({ reason: "No cloud twist" });
}

// 5. Kijun bounce
export function kijunBounce(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i);
  const cl = cloud(c, i);
  // Yükseliş trendinde (bulut üstü) kijun'a geri çekilip dönüş = long
  if (c[i].close > cl.top && c[i].low <= now.kijun && c[i].close > c[i].open && c[i].close > now.kijun) return mk(c, i, "long", a, 0.7, "Bounce off Kijun in uptrend");
  if (c[i].close < cl.bot && c[i].high >= now.kijun && c[i].close < c[i].open && c[i].close < now.kijun) return mk(c, i, "short", a, 0.7, "Rejection at Kijun in downtrend");
  return makeSignal({ reason: "No Kijun reaction" });
}

// 6. Full TK + price + cloud alignment
export function tkPriceAlign(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), cl = cloud(c, i);
  const bull = now.tenkan > now.kijun && c[i].close > cl.top && c[i].close > now.tenkan;
  const bear = now.tenkan < now.kijun && c[i].close < cl.bot && c[i].close < now.tenkan;
  const prev = ichi(c, i - 1), clPrev = cloud(c, i - 1);
  const bullPrev = prev.tenkan > prev.kijun && c[i - 1].close > clPrev.top;
  const bearPrev = prev.tenkan < prev.kijun && c[i - 1].close < clPrev.bot;
  if (bull && !bullPrev) return mk(c, i, "long", a, 0.74, "Full Ichimoku bullish alignment");
  if (bear && !bearPrev) return mk(c, i, "short", a, 0.74, "Full Ichimoku bearish alignment");
  return makeSignal({ reason: "Ichimoku not aligned" });
}

// 7. Flat Kijun magnet
export function flatKijun(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const k = [ichi(c, i).kijun, ichi(c, i - 1).kijun, ichi(c, i - 2).kijun, ichi(c, i - 3).kijun];
  const flat = Math.max(...k) - Math.min(...k) < a[i] * 0.3; // düz kijun
  const now = ichi(c, i);
  // Düz kijun mıknatıs gibi çeker — fiyat uzaktaysa kijun'a doğru
  if (flat && c[i].close < now.kijun - a[i] && c[i].close > c[i].open) return mk(c, i, "long", a, 0.67, "Flat Kijun magnet pull up");
  if (flat && c[i].close > now.kijun + a[i] && c[i].close < c[i].open) return mk(c, i, "short", a, 0.67, "Flat Kijun magnet pull down");
  return makeSignal({ reason: "No flat-Kijun setup" });
}

// 8. Cloud thickness trend strength
export function cloudThickness(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cl = cloud(c, i), now = ichi(c, i);
  const thick = (cl.top - cl.bot) > a[i] * 2; // kalın bulut = güçlü destek/direnç
  if (thick && c[i].close > cl.top && now.tenkan > now.kijun && c[i - 1].close <= cloud(c, i - 1).top) return mk(c, i, "long", a, 0.71, "Break above thick cloud (strong support)");
  if (thick && c[i].close < cl.bot && now.tenkan < now.kijun && c[i - 1].close >= cloud(c, i - 1).bot) return mk(c, i, "short", a, 0.71, "Break below thick cloud (strong resistance)");
  return makeSignal({ reason: "No thick-cloud break" });
}

// 9. Lagging span breakout
export function laggingBreakout(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  // Chikou (close) 26 bar önceki bulutu kırar
  const clPast = cloud(c, i - 26 < 78 ? 78 : i); // şimdiki chikou'nun referansı geçmiş bulut
  const past = ichi(c, i - 26);
  const pastTop = Math.max(past.spanA, past.spanB), pastBot = Math.min(past.spanA, past.spanB);
  if (c[i].close > pastTop && c[i - 26].close <= pastTop) return mk(c, i, "long", a, 0.68, "Lagging span cleared past cloud (bullish)");
  if (c[i].close < pastBot && c[i - 26].close >= pastBot) return mk(c, i, "short", a, 0.68, "Lagging span broke past cloud (bearish)");
  return makeSignal({ reason: "No lagging breakout" });
}

// 10. Full Ichimoku confluence (all 5 signals)
export function fullIchimoku(c: Candle[]): Signal {
  if (c.length < 90) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), now = ichi(c, i), cl = cloud(c, i);
  const chikouOk = (dir: number) => dir > 0 ? c[i].close > c[i - 26].close : c[i].close < c[i - 26].close;
  let score = 0;
  score += now.tenkan > now.kijun ? 1 : -1;
  score += c[i].close > cl.top ? 1 : (c[i].close < cl.bot ? -1 : 0);
  score += now.spanA > now.spanB ? 1 : -1;
  score += c[i].close > now.kijun ? 1 : -1;
  score += chikouOk(1) ? 1 : (chikouOk(-1) ? -1 : 0);
  if (score >= 4) return mk(c, i, "long", a, 0.73, `Ichimoku full bullish confluence (${score}/5)`);
  if (score <= -4) return mk(c, i, "short", a, 0.73, `Ichimoku full bearish confluence (${score}/5)`);
  return makeSignal({ reason: `Ichimoku score ${score}` });
}
