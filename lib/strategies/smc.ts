import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

// 1. FVG
export function fvg(c: Candle[]): Signal {
  if (c.length < 205) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14);
  const e = ema(closes, 200);
  const price = closes[closes.length - 1];
  const trend = price > e[e.length - 1] ? "up" : "down";
  for (let i = c.length - 2; i >= 2; i--) {
    const ai = a[i];
    if (isNaN(ai)) continue;
    // bullish
    if (c[i - 2].high < c[i].low && c[i].low - c[i - 2].high >= ai * 0.3) {
      const mid = (c[i].low + c[i - 2].high) / 2;
      if (trend === "up" && price > c[i - 2].high && price < c[i].low) {
        const sl = c[i - 2].high - 0.5 * a[a.length - 1];
        const r = mid - sl;
        return makeSignal({ signal: "long", entry: mid, stop_loss: sl, take_profit: [mid + r * 2, mid + r * 3, mid + r * 5], confidence: 0.75, reason: `Bullish FVG mitigation @ ${mid.toFixed(2)}` });
      }
    }
    // bearish
    if (c[i - 2].low > c[i].high && c[i - 2].low - c[i].high >= ai * 0.3) {
      const mid = (c[i - 2].low + c[i].high) / 2;
      if (trend === "down" && price < c[i - 2].low && price > c[i].high) {
        const sl = c[i - 2].low + 0.5 * a[a.length - 1];
        const r = sl - mid;
        return makeSignal({ signal: "short", entry: mid, stop_loss: sl, take_profit: [mid - r * 2, mid - r * 3, mid - r * 5], confidence: 0.75, reason: `Bearish FVG mitigation @ ${mid.toFixed(2)}` });
      }
    }
  }
  return makeSignal({ reason: "No active FVG entry" });
}

// 2. Order Block
export function orderBlock(c: Candle[]): Signal {
  if (c.length < 210) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14);
  const e = ema(closes, 200);
  const price = closes[closes.length - 1];
  const trend = price > e[e.length - 1] ? "up" : "down";
  const start = Math.max(3, c.length - 50);
  for (let i = c.length - 2; i >= start; i--) {
    const ai = a[i];
    if (isNaN(ai)) continue;
    const cur = c[i], nx = c[i + 1];
    if (cur.close < cur.open && nx.high - cur.low >= ai * 1.5 && nx.close > cur.high) {
      if (trend === "up" && price <= cur.high && price >= cur.low) {
        const entry = (cur.high + cur.low) / 2, sl = cur.low - 0.5 * a[a.length - 1], r = entry - sl;
        return makeSignal({ signal: "long", entry, stop_loss: sl, take_profit: [entry + r * 2, entry + r * 3, entry + r * 5], confidence: 0.78, reason: "Bullish OB retest" });
      }
    }
    if (cur.close > cur.open && cur.high - nx.low >= ai * 1.5 && nx.close < cur.low) {
      if (trend === "down" && price <= cur.high && price >= cur.low) {
        const entry = (cur.high + cur.low) / 2, sl = cur.high + 0.5 * a[a.length - 1], r = sl - entry;
        return makeSignal({ signal: "short", entry, stop_loss: sl, take_profit: [entry - r * 2, entry - r * 3, entry - r * 5], confidence: 0.78, reason: "Bearish OB retest" });
      }
    }
  }
  return makeSignal({ reason: "Aktif OB retest yok" });
}

// 3. Liquidity Grab + BOS
export function liquidityGrabBos(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 10).filter((v): v is number => v !== null);
  const sl = swingLows(c, 10).filter((v): v is number => v !== null);
  if (sh.length < 2 || sl.length < 2) return makeSignal({ reason: "No clean structure" });
  const a = atr(c, 14);
  const cur = c[c.length - 1], prev = c[c.length - 2];
  const lastH = sh[sh.length - 1], lastL = sl[sl.length - 1];
  if (prev.low < lastL && prev.close > lastL && cur.close > lastH) {
    const slv = prev.low - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.82, reason: "Liquidity grab + BOS up" });
  }
  if (prev.high > lastH && prev.close < lastH && cur.close < lastL) {
    const slv = prev.high + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.82, reason: "Liquidity grab + BOS down" });
  }
  return makeSignal({ reason: "LG+BOS kurulumu yok" });
}

// 4. Inducement
export function inducement(c: Candle[]): Signal {
  if (c.length < 24) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 8).filter((v): v is number => v !== null);
  const sl = swingLows(c, 8).filter((v): v is number => v !== null);
  if (sh.length < 2 || sl.length < 2) return makeSignal({ reason: "No structure" });
  const a = atr(c, 14), cur = c[c.length - 1], last3 = c.slice(-4, -1);
  const lastL = sl[sl.length - 1], lastH = sh[sh.length - 1];
  const wickBelow = last3.some((x) => x.low < lastL && x.close > lastL);
  const max3 = Math.max(...last3.map((x) => x.high));
  if (wickBelow && cur.close > cur.open && cur.close > max3) {
    const min3 = Math.min(...last3.map((x) => x.low)), slv = min3 - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.7, reason: "Bullish inducement" });
  }
  const wickAbove = last3.some((x) => x.high > lastH && x.close < lastH);
  const min3 = Math.min(...last3.map((x) => x.low));
  if (wickAbove && cur.close < cur.open && cur.close < min3) {
    const max3b = Math.max(...last3.map((x) => x.high)), slv = max3b + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.7, reason: "Bearish inducement" });
  }
  return makeSignal({ reason: "Inducement kurulumu yok" });
}

// 5. Equal Highs/Lows Sweep
export function eqSweep(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const a = atr(c, 14), tol = a[a.length - 1] * 0.15;
  const rh = swingHighs(c, 5).filter((v): v is number => v !== null).slice(-10);
  const rl = swingLows(c, 5).filter((v): v is number => v !== null).slice(-10);
  let eqh: number | null = null, eql: number | null = null;
  for (let i = 0; i < rh.length - 1; i++) for (let j = i + 1; j < rh.length; j++) if (Math.abs(rh[i] - rh[j]) <= tol) eqh = Math.max(rh[i], rh[j]);
  for (let i = 0; i < rl.length - 1; i++) for (let j = i + 1; j < rl.length; j++) if (Math.abs(rl[i] - rl[j]) <= tol) eql = Math.min(rl[i], rl[j]);
  const cur = c[c.length - 1], prev = c[c.length - 2];
  if (eql !== null && prev.low < eql && prev.close > eql && cur.close > cur.open) {
    const slv = prev.low - 0.3 * a[a.length - 1], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.76, reason: `EQL sweep @ ${eql.toFixed(2)}` });
  }
  if (eqh !== null && prev.high > eqh && prev.close < eqh && cur.close < cur.open) {
    const slv = prev.high + 0.3 * a[a.length - 1], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.76, reason: `EQH sweep @ ${eqh.toFixed(2)}` });
  }
  return makeSignal({ reason: "EQH/EQL sweep yok" });
}

// 6. Breaker Block
export function breakerBlock(c: Candle[]): Signal {
  if (c.length < 220) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14), e = ema(closes, 200);
  const cur = c[c.length - 1], price = cur.close;
  const trend = price > e[e.length - 1] ? "up" : "down";
  const start = Math.max(3, c.length - 80);
  for (let i = start; i < c.length - 3; i++) {
    const ai = a[i]; if (isNaN(ai)) continue;
    const cc = c[i], nx = c[i + 1];
    // bullish OB
    if (cc.close < cc.open && nx.high - cc.low >= ai * 1.2 && nx.close > cc.high) {
      const post = c.slice(i + 2);
      if (post.some((x) => x.close < cc.low) && cur.high >= cc.low && cur.low <= cc.high && trend === "down") {
        const entry = (cc.high + cc.low) / 2, slv = cc.high + 0.5 * a[a.length - 1], r = slv - entry;
        return makeSignal({ signal: "short", entry, stop_loss: slv, take_profit: [entry - r * 2, entry - r * 3, entry - r * 5], confidence: 0.74, reason: "Bearish breaker" });
      }
    }
    if (cc.close > cc.open && cc.high - nx.low >= ai * 1.2 && nx.close < cc.low) {
      const post = c.slice(i + 2);
      if (post.some((x) => x.close > cc.high) && cur.high >= cc.low && cur.low <= cc.high && trend === "up") {
        const entry = (cc.high + cc.low) / 2, slv = cc.low - 0.5 * a[a.length - 1], r = entry - slv;
        return makeSignal({ signal: "long", entry, stop_loss: slv, take_profit: [entry + r * 2, entry + r * 3, entry + r * 5], confidence: 0.74, reason: "Bullish breaker" });
      }
    }
  }
  return makeSignal({ reason: "Breaker kurulumu yok" });
}

// 7. OTE
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

// 8. ChoCH (Change of Character) - market structure shift
export function chochSignal(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 8), sl = swingLows(c, 8);
  const highs: { i: number; v: number }[] = [], lows: { i: number; v: number }[] = [];
  sh.forEach((v, i) => v !== null && highs.push({ i, v }));
  sl.forEach((v, i) => v !== null && lows.push({ i, v }));
  if (highs.length < 3 || lows.length < 3) return makeSignal({ reason: "Insufficient swings" });
  const a = atr(c, 14), cur = c[c.length - 1], ai = a.length - 1;
  // Bearish ChoCH: önceden HH-HL trendi, şimdi son low önceki low'u kırdı
  const lastL = lows[lows.length - 1], prevL = lows[lows.length - 2], prevPrevL = lows[lows.length - 3];
  const lastH = highs[highs.length - 1], prevH = highs[highs.length - 2];
  if (prevPrevL.v < prevL.v && prevH.v < lastH.v && lastL.v < prevL.v) {
    const slv = lastH.v + 0.3 * a[ai], r = slv - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 2, cur.close - r * 3, cur.close - r * 5], confidence: 0.79, reason: "Bearish ChoCH: HH-HL broken" });
  }
  // Bullish ChoCH: LH-LL'den sonra son high önceki high'ı kırdı
  if (prevPrevL.v > prevL.v && lastH.v > prevH.v && lastL.v > prevL.v) {
    const slv = lastL.v - 0.3 * a[ai], r = cur.close - slv;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.79, reason: "Bullish ChoCH: LH-LL broken" });
  }
  return makeSignal({ reason: "No ChoCH" });
}

// 9. Premium/Discount Zones (fib bazlı)
export function premiumDiscount(c: Candle[]): Signal {
  if (c.length < 80) return makeSignal({ reason: "Insufficient data" });
  const rng = c.slice(-50);
  const rH = Math.max(...rng.map((x) => x.high)), rL = Math.min(...rng.map((x) => x.low));
  const mid = (rH + rL) / 2, cur = c[c.length - 1], a = atr(c, 14);
  const ai = a.length - 1;
  const pct = (cur.close - rL) / (rH - rL); // 0..1
  // Discount zone (0-0.5): long
  if (pct < 0.3 && cur.close > cur.open) {
    const slv = rL - 0.3 * a[ai], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [mid, mid + (rH - mid) * 0.5, rH], confidence: 0.74, reason: `Discount zone @ ${(pct*100).toFixed(0)}%` });
  }
  // Premium zone (0.7-1): short
  if (pct > 0.7 && cur.close < cur.open) {
    const slv = rH + 0.3 * a[ai], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [mid, mid - (mid - rL) * 0.5, rL], confidence: 0.74, reason: `Premium zone @ ${(pct*100).toFixed(0)}%` });
  }
  return makeSignal({ reason: `Equilibrium zone @ ${(pct*100).toFixed(0)}%` });
}

// 10. Power of 3 (PO3) - Accumulation/Manipulation/Distribution
export function powerOf3(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  // Son 24 mumu 3 faza böl: 8 mum accumulation, 8 mum manipulation, mevcut distribution başlangıcı
  const accum = c.slice(-24, -16);
  const manip = c.slice(-16, -8);
  const cur = c[c.length - 1];
  const a = atr(c, 14), ai = a.length - 1;
  // Accumulation: dar range
  const accH = Math.max(...accum.map((x) => x.high)), accL = Math.min(...accum.map((x) => x.low));
  const accRange = accH - accL;
  if (accRange > a[ai] * 4) return makeSignal({ reason: "No accumulation phase (range too wide)" });
  // Manipulation: range dışına wick at ama kapatma
  const manipBelowAcc = manip.some((x) => x.low < accL && x.close > accL);
  const manipAboveAcc = manip.some((x) => x.high > accH && x.close < accH);
  // Bullish PO3: manip aşağıya wick → distribution yukarı
  if (manipBelowAcc && cur.close > accH && cur.close > cur.open) {
    const slv = Math.min(...manip.map((x) => x.low)) - 0.3 * a[ai], r = cur.close - slv;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: slv, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.81, reason: "PO3: Accum + downside manip + upside distribution" });
  }
  // Bearish PO3
  if (manipAboveAcc && cur.close < accL && cur.close < cur.open) {
    const slv = Math.max(...manip.map((x) => x.high)) + 0.3 * a[ai], r = slv - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: slv, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.81, reason: "PO3: Accum + upside manip + downside distribution" });
  }
  return makeSignal({ reason: "PO3 setup incomplete" });
}
