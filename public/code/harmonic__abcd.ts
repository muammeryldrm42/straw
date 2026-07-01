import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

function pivots(c: Candle[], lb = 5): { idx: number; price: number; type: "H" | "L" }[] {
  const sh = swingHighs(c, lb), sl = swingLows(c, lb);
  const pts: { idx: number; price: number; type: "H" | "L" }[] = [];
  for (let i = 0; i < c.length; i++) {
    if (sh[i] !== null) pts.push({ idx: i, price: sh[i] as number, type: "H" });
    if (sl[i] !== null) pts.push({ idx: i, price: sl[i] as number, type: "L" });
  }
  pts.sort((a, b) => a.idx - b.idx);
  // Ardışık aynı tipleri filtrele (zigzag yap)
  const zz: typeof pts = [];
  for (const p of pts) {
    if (zz.length && zz[zz.length - 1].type === p.type) {
      if ((p.type === "H" && p.price > zz[zz.length - 1].price) || (p.type === "L" && p.price < zz[zz.length - 1].price)) zz[zz.length - 1] = p;
    } else zz.push(p);
  }
  return zz;
}
function harmonicCheck(c: Candle[], name: string, conf: number, ab: [number, number], bc: [number, number], cd: [number, number], xa?: [number, number]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const zz = pivots(c, 5);
  if (zz.length < 5) return makeSignal({ reason: "Not enough pivots" });
  const [X, A, B, C, D] = zz.slice(-5);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  // D son pivotlardan biri ve fiyata yakın olmalı
  if (i - D.idx > 5) return makeSignal({ reason: `${name}: pattern too old` });
  const XA = Math.abs(A.price - X.price);
  const AB = Math.abs(B.price - A.price);
  const BC = Math.abs(C.price - B.price);
  const CD = Math.abs(D.price - C.price);
  if (XA === 0 || AB === 0 || BC === 0) return makeSignal({ reason: `${name}: degenerate` });
  const rAB = AB / XA, rBC = BC / AB, rCD = CD / BC;
  const inRange = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;
  if (!inRange(rAB, ab) || !inRange(rBC, bc) || !inRange(rCD, cd)) {
    return makeSignal({ reason: `${name}: ratios off (AB ${rAB.toFixed(2)})` });
  }
  // Bullish: D bir low (X-A yukarı değil aşağı pattern). D.type belirler yönü
  const bullish = D.type === "L";
  if (bullish) {
    const sl = D.price - 1.5 * a[i], r = cur.close - sl;
    if (r <= 0) return makeSignal({ reason: `${name}: invalid risk` });
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [C.price, A.price, A.price + (A.price - D.price) * 0.5], confidence: conf, reason: `${name} bullish (D completion)` });
  } else {
    const sl = D.price + 1.5 * a[i], r = sl - cur.close;
    if (r <= 0) return makeSignal({ reason: `${name}: invalid risk` });
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [C.price, A.price, A.price - (D.price - A.price) * 0.5], confidence: conf, reason: `${name} bearish (D completion)` });
  }
}

export function abcd(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const zz = pivots(c, 5);
  if (zz.length < 4) return makeSignal({ reason: "Not enough pivots" });
  const [A, B, C, D] = zz.slice(-4);
  const a = atr(c, 14), i = c.length - 1, cur = c[i];
  if (i - D.idx > 5) return makeSignal({ reason: "ABCD: pattern too old" });
  const AB = Math.abs(B.price - A.price), BC = Math.abs(C.price - B.price), CD = Math.abs(D.price - C.price);
  if (AB === 0 || BC === 0) return makeSignal({ reason: "ABCD: degenerate" });
  const rBC = BC / AB, rCD = CD / AB;
  // AB≈CD (0.8-1.3) ve BC retrace 0.382-0.886
  if (rBC < 0.38 || rBC > 0.89 || rCD < 0.8 || rCD > 1.35) return makeSignal({ reason: `ABCD: ratios off (CD/AB ${rCD.toFixed(2)})` });
  const bullish = D.type === "L";
  if (bullish) {
    const sl = D.price - 1.5 * a[i], r = cur.close - sl;
    if (r <= 0) return makeSignal({ reason: "ABCD: invalid risk" });
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [C.price, B.price, A.price], confidence: 0.69, reason: "ABCD bullish completion" });
  }
  const sl = D.price + 1.5 * a[i], r = sl - cur.close;
  if (r <= 0) return makeSignal({ reason: "ABCD: invalid risk" });
  return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [C.price, B.price, A.price], confidence: 0.69, reason: "ABCD bearish completion" });
}
