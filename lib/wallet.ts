// Strategy DEX Demo Wallet v2 - leverage support (1x - 25x)
// size = NOTIONAL pozisyon büyüklüğü (USD). margin = size / leverage (bakiyeden ayrılan)
// PnL = notional × fiyat değişimi. ROE = PnL / margin (yatırdığın paraya göre kar yüzdesi).
"use client";

export const MAX_LEVERAGE = 25;
export const MAINTENANCE_MR = 0.95; // bakiyenin %95'i kaybedildiğinde liquidate

export interface Position {
  id: string;
  strategy: string;
  symbol: string;
  side: "long" | "short";
  entry: number;
  size: number;         // NOTIONAL (USD)
  leverage: number;     // 1..25
  margin: number;       // size / leverage - bakiyeden alınan gerçek tutar
  stop_loss: number;
  take_profit: number[];
  liquidation: number;  // hesaplanmış likidasyon fiyatı
  tpHit: boolean[];
  openTime: number;
  reason: string;
  partialClosed?: boolean;  // TP1'de %50 kapatma yapıldı mı
  realizedPnl?: number;     // kısmi kapatmalardan realize edilen PnL
  initialSize?: number;     // orijinal notional (ROE/gösterim için)
  initialMargin?: number;   // orijinal margin
}

export interface ClosedTrade {
  id: string;
  strategy: string;
  symbol: string;
  side: "long" | "short";
  leverage: number;
  entry: number;
  exit: number;
  size: number;
  margin: number;
  pnl: number;
  pnlPct: number;       // notional bazlı %
  roe: number;          // margin bazlı %
  reason: string;
  closeReason: string;
  openTime: number;
  closeTime: number;
}

export interface WalletState {
  balance: number;
  positions: Position[];
  history: ClosedTrade[];
  topups: number;
  equityHistory: { t: number; eq: number }[]; // equity curve için snapshotlar
}

const KEY = "talons_wallet_v2";
const START = 1000;

export function loadWallet(): WalletState {
  if (typeof window === "undefined") return defaultWallet();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWallet();
    const w = JSON.parse(raw);
    // v1 -> v2 migration
    if (!w.equityHistory) w.equityHistory = [];
    w.positions = (w.positions || []).map((p: any) => ({
      ...p,
      leverage: p.leverage || 1,
      margin: p.margin ?? p.size,
      liquidation: p.liquidation ?? calcLiquidation(p.side, p.entry, p.leverage || 1),
    }));
    return w;
  } catch {
    return defaultWallet();
  }
}

function defaultWallet(): WalletState {
  return { balance: START, positions: [], history: [], topups: 0, equityHistory: [] };
}

export function saveWallet(w: WalletState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(w));
}

export function resetWallet(): WalletState {
  const w = defaultWallet();
  saveWallet(w);
  return w;
}

export function topUp(w: WalletState, amount = 1000): WalletState {
  const nw = { ...w, balance: w.balance + amount, topups: w.topups + amount };
  saveWallet(nw);
  return nw;
}

// Likidasyon fiyatı: margin'in %95'i kaybedildiğinde
export function calcLiquidation(side: "long" | "short", entry: number, leverage: number): number {
  const buffer = MAINTENANCE_MR / leverage;
  return side === "long" ? entry * (1 - buffer) : entry * (1 + buffer);
}

export function calcPnl(pos: Position, price: number): number {
  const change = pos.side === "long"
    ? (price - pos.entry) / pos.entry
    : (pos.entry - price) / pos.entry;
  return pos.size * change; // notional × değişim
}

export function calcRoe(pos: Position, price: number): number {
  return (calcPnl(pos, price) / pos.margin) * 100;
}

export function calcPnlPct(pos: Position, price: number): number {
  const change = pos.side === "long"
    ? (price - pos.entry) / pos.entry
    : (pos.entry - price) / pos.entry;
  return change * 100;
}

// Pozisyon aç - leverage parametresi ile
export function openPosition(
  w: WalletState,
  p: Omit<Position, "id" | "openTime" | "tpHit" | "margin" | "liquidation">
): { wallet: WalletState; error?: string } {
  const lev = Math.max(1, Math.min(MAX_LEVERAGE, p.leverage || 1));
  const margin = p.size / lev;
  if (margin > w.balance) return { wallet: w, error: `Yetersiz bakiye (gerekli margin: $${margin.toFixed(2)})` };
  if (p.size <= 0) return { wallet: w, error: "Boyut > 0 olmalı" };
  const liq = calcLiquidation(p.side, p.entry, lev);
  const pos: Position = {
    ...p,
    leverage: lev,
    margin,
    liquidation: liq,
    id: Math.random().toString(36).slice(2, 10),
    openTime: Date.now(),
    tpHit: p.take_profit.map(() => false),
    partialClosed: false,
    realizedPnl: 0,
    initialSize: p.size,
    initialMargin: margin,
  };
  const nw: WalletState = {
    ...w,
    balance: w.balance - margin,
    positions: [...w.positions, pos],
  };
  saveWallet(nw);
  return { wallet: nw };
}

export function closePosition(w: WalletState, posId: string, exitPrice: number, closeReason: string): WalletState {
  const pos = w.positions.find((p) => p.id === posId);
  if (!pos) return w;
  let pnl = calcPnl(pos, exitPrice);
  // Liquidation ise kalan margin sıfırlanır (tam kayıp)
  if (closeReason === "Liquidated") pnl = -pos.margin;
  const realized = pos.realizedPnl || 0;
  const totalPnl = pnl + realized; // kısmi kapatma + final
  const baseMargin = pos.initialMargin ?? pos.margin;
  const closed: ClosedTrade = {
    id: pos.id, strategy: pos.strategy, symbol: pos.symbol, side: pos.side,
    leverage: pos.leverage,
    entry: pos.entry, exit: exitPrice, size: pos.initialSize ?? pos.size, margin: baseMargin,
    pnl: totalPnl,
    pnlPct: calcPnlPct(pos, exitPrice),
    roe: (totalPnl / baseMargin) * 100,
    reason: pos.reason, closeReason,
    openTime: pos.openTime, closeTime: Date.now(),
  };
  const nw: WalletState = {
    ...w,
    balance: w.balance + pos.margin + pnl, // kalan margin + kalan pnl (realized zaten eklenmişti)
    positions: w.positions.filter((p) => p.id !== posId),
    history: [closed, ...w.history].slice(0, 200),
  };
  saveWallet(nw);
  return nw;
}

// TP1'de pozisyonun %50'sini kapat, kalan için SL'yi breakeven'a çek (trailing)
function partialClose(w: WalletState, posId: string, price: number): WalletState {
  const pos = w.positions.find((p) => p.id === posId);
  if (!pos) return w;
  const pnlHalf = calcPnl(pos, price) * 0.5;
  const marginHalf = pos.margin * 0.5;
  const updated: Position = {
    ...pos,
    size: pos.size * 0.5,
    margin: pos.margin * 0.5,
    realizedPnl: (pos.realizedPnl || 0) + pnlHalf,
    partialClosed: true,
    stop_loss: pos.entry, // breakeven: kalan pozisyon artık risksiz
    tpHit: pos.tpHit.map((h, i) => (i === 0 ? true : h)),
  };
  const nw: WalletState = {
    ...w,
    balance: w.balance + marginHalf + pnlHalf, // yarısının margin'i + kârı serbest
    positions: w.positions.map((p) => (p.id === posId ? updated : p)),
  };
  saveWallet(nw);
  return nw;
}

// Her fiyat tickinde: liquidation > SL > TP1(partial) > final TP
export function checkPositions(w: WalletState, symbol: string, price: number): { wallet: WalletState; events: string[] } {
  let nw = w;
  const events: string[] = [];
  for (const p0 of w.positions.filter((p) => p.symbol === symbol)) {
    const pos = nw.positions.find((p) => p.id === p0.id);
    if (!pos) continue;
    // 1. Liquidation - en öncelikli
    const liqHit = pos.side === "long" ? price <= pos.liquidation : price >= pos.liquidation;
    if (liqHit) {
      nw = closePosition(nw, pos.id, pos.liquidation, "Liquidated");
      events.push(`💀 ${pos.strategy} ${pos.leverage}x LİKİDE @ ${pos.liquidation.toFixed(4)}`);
      continue;
    }
    // 2. SL (partial sonrası breakeven olabilir)
    const slHit = pos.stop_loss > 0 && (pos.side === "long" ? price <= pos.stop_loss : price >= pos.stop_loss);
    if (slHit) {
      const reason = pos.partialClosed ? "Breakeven" : "Stop Loss";
      nw = closePosition(nw, pos.id, pos.stop_loss, reason);
      events.push(`${pos.partialClosed ? "⚖️" : "🔴"} ${pos.strategy} ${pos.leverage}x ${reason} @ ${pos.stop_loss.toFixed(4)}`);
      continue;
    }
    // 3. TP1 — kısmi kapatma (en az 2 TP varsa) + SL'yi breakeven'a çek
    if (!pos.partialClosed && pos.take_profit.length >= 2) {
      const tp1 = pos.take_profit[0];
      const tp1Hit = pos.side === "long" ? price >= tp1 : price <= tp1;
      if (tp1Hit) {
        nw = partialClose(nw, pos.id, tp1);
        events.push(`🎯 ${pos.strategy} ${pos.leverage}x TP1 @ ${tp1.toFixed(4)} · +50% closed, SL→breakeven`);
        continue;
      }
    }
    // 4. Final TP
    const lastTp = pos.take_profit[pos.take_profit.length - 1];
    const tpHit = pos.take_profit.length > 0 && (pos.side === "long" ? price >= lastTp : price <= lastTp);
    if (tpHit) {
      nw = closePosition(nw, pos.id, lastTp, "Take Profit");
      events.push(`🟢 ${pos.strategy} ${pos.leverage}x TP @ ${lastTp.toFixed(4)}`);
    }
  }
  return { wallet: nw, events };
}

export function equity(w: WalletState, prices: Record<string, number>): number {
  let eq = w.balance;
  for (const pos of w.positions) {
    const price = prices[pos.symbol] ?? pos.entry;
    eq += pos.margin + calcPnl(pos, price);
  }
  return eq;
}

// Equity snapshot kaydet (max 200)
export function snapshotEquity(w: WalletState, prices: Record<string, number>): WalletState {
  const eq = equity(w, prices);
  const last = w.equityHistory[w.equityHistory.length - 1];
  // Aynı dakikada tekrar kaydetme
  if (last && Date.now() - last.t < 60000) return w;
  const nw = {
    ...w,
    equityHistory: [...w.equityHistory, { t: Date.now(), eq }].slice(-200),
  };
  saveWallet(nw);
  return nw;
}

// İstatistikler
export interface Stats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  biggestWin: number;
  biggestLoss: number;
  liquidations: number;
  bestSymbol: string;
  bestStrategy: string;
}

export function calcStats(w: WalletState): Stats {
  const h = w.history;
  if (h.length === 0) return {
    totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0,
    avgWin: 0, avgLoss: 0, biggestWin: 0, biggestLoss: 0,
    liquidations: 0, bestSymbol: "-", bestStrategy: "-",
  };
  const wins = h.filter((t) => t.pnl > 0);
  const losses = h.filter((t) => t.pnl <= 0);
  const totalPnl = h.reduce((s, t) => s + t.pnl, 0);
  const bySymbol: Record<string, number> = {};
  const byStrategy: Record<string, number> = {};
  h.forEach((t) => {
    bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + t.pnl;
    byStrategy[t.strategy] = (byStrategy[t.strategy] || 0) + t.pnl;
  });
  const bestSymbol = Object.entries(bySymbol).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const bestStrategy = Object.entries(byStrategy).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  return {
    totalTrades: h.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / h.length) * 100,
    totalPnl,
    avgWin: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
    avgLoss: losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
    biggestWin: Math.max(0, ...h.map((t) => t.pnl)),
    biggestLoss: Math.min(0, ...h.map((t) => t.pnl)),
    liquidations: h.filter((t) => t.closeReason === "Liquidated").length,
    bestSymbol, bestStrategy,
  };
}
