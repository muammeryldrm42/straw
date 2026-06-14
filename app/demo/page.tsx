"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { STRATEGIES, getStrategy, ALL_CATEGORIES } from "@/lib/registry";
import { Candle } from "@/lib/indicators";
import * as W from "@/lib/wallet";
import PriceChart from "@/components/PriceChart";
import EquityCurve from "@/components/EquityCurve";
import { useT } from "@/lib/i18n";
import { useSodexMarkets } from "@/lib/useSodexMarkets";
import { SymbolPicker } from "@/components/SymbolPicker";

const sym = (s: string) => s.replace("SODEX:", "");

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"];
const LEVERAGES = [1, 2, 3, 5, 10, 15, 20, 25];

function DemoInner() {
  const { t } = useT();
  const params = useSearchParams();
  const initialStrat = params.get("strategy") || "fvg";
  const initialSymbol = params.get("symbol") || "SODEX:BTC-USD";

  const [stratId, setStratId] = useState(initialStrat);
  const [symbol, setSymbol] = useState(initialSymbol);
  const sodexMarkets = useSodexMarkets();
  const [extPrices, setExtPrices] = useState<Record<string, number>>({});
  const [interval, setIntervalV] = useState("15m");
  const [indicators, setIndicators] = useState<string[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [leverage, setLeverage] = useState(5);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState(0);
  const [wallet, setWallet] = useState<W.WalletState>({ balance: 1000, positions: [], history: [], topups: 0, equityHistory: [] });
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [posSize, setPosSize] = useState(100);
  const [lastSignal, setLastSignal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const isManual = stratId === "__manual__";
  const strat = isManual ? null : getStrategy(stratId)!;
  const runnable = !isManual && strat?.run != null;

  useEffect(() => { setWallet(W.loadWallet()); }, []);

  const pushLog = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${m}`, ...l].slice(0, 50));

  const fetchData = async () => {
    try {
      const r = await fetch(`/api/klines?symbol=${symbol}&interval=${interval}&limit=300`);
      const d = await r.json();
      if (d.candles?.length) {
        setCandles(d.candles);
        const p = d.candles[d.candles.length - 1].close;
        setPrice(p);
        const { wallet: nw, events } = W.checkPositions(walletRef.current, symbol, p);
        if (events.length) { setWallet(nw); events.forEach(pushLog); }
        const ew = W.snapshotEquity(events.length ? nw : walletRef.current, { [symbol]: p });
        if (ew.equityHistory.length !== walletRef.current.equityHistory.length) setWallet(ew);
      } else if (d.error) pushLog(`⚠ ${d.error}`);
    } catch { pushLog(`⚠ ${t("log.fetch_fail")}`); }
    setLoading(false);
  };

  useEffect(() => { setLoading(true); fetchData(); /* eslint-disable-next-line */ }, [symbol, interval]);
  useEffect(() => { const tm = setInterval(fetchData, 10000); return () => clearInterval(tm); /* eslint-disable-next-line */ }, [symbol, interval]);

  // Açık pozisyonların (aktif sembol dışındaki) güncel fiyatlarını çek → tüm PnL/ROE canlı görünsün
  const openSymbolsKey = Array.from(new Set(wallet.positions.map((p) => p.symbol))).join(",");
  useEffect(() => {
    const syms = Array.from(new Set(wallet.positions.map((p) => p.symbol))).filter((s) => s !== symbol);
    if (!syms.length) { setExtPrices({}); return; }
    let alive = true;
    const fetchPrices = async () => {
      const entries = await Promise.all(syms.map(async (s) => {
        try {
          const r = await fetch(`/api/klines?symbol=${encodeURIComponent(s)}&interval=1m&limit=50`);
          const d = await r.json();
          const c = d.candles || [];
          return [s, c.length ? c[c.length - 1].close : 0] as const;
        } catch { return [s, 0] as const; }
      }));
      if (alive) setExtPrices(Object.fromEntries(entries.filter(([, p]) => p > 0)));
    };
    fetchPrices();
    const tm = setInterval(fetchPrices, 15000);
    return () => { alive = false; clearInterval(tm); };
    /* eslint-disable-next-line */
  }, [openSymbolsKey, symbol]);

  useEffect(() => {
    if (!auto || !runnable || candles.length < 50) return;
    const tm = setInterval(() => {
      const sig = strat.run!(candles);
      setLastSignal(sig);
      const w = walletRef.current;
      const hasOpen = w.positions.some((p) => p.symbol === symbol && p.strategy === strat.name);
      if ((sig.signal === "long" || sig.signal === "short") && !hasOpen && sig.entry > 0) {
        const res = W.openPosition(w, {
          strategy: strat.name, symbol, side: sig.signal,
          entry: price, size: posSize * leverage, leverage,
          stop_loss: sig.stop_loss, take_profit: sig.take_profit, reason: sig.reason,
        });
        if (res.error) pushLog(`⚠ ${res.error}`);
        else { setWallet(res.wallet); pushLog(`${sig.signal === "long" ? "🟢 LONG" : "🔴 SHORT"} ${leverage}x ${symbol} @ ${price.toFixed(4)} · ${sig.reason}`); }
      }
    }, 8000);
    return () => clearInterval(tm);
    // eslint-disable-next-line
  }, [auto, candles, stratId, symbol, posSize, price, runnable, leverage]);

  const testSignal = () => {
    if (!runnable || candles.length < 50) return;
    const sig = strat.run!(candles);
    setLastSignal(sig);
    pushLog(`${t("log.signal")}: ${sig.signal.toUpperCase()} · ${sig.reason}`);
  };

  const manualOpen = (side: "long" | "short") => {
    const sig = !isManual && lastSignal && lastSignal.signal === side ? lastSignal : null;
    const sl = isManual ? 0 : (sig ? sig.stop_loss : (side === "long" ? price * (1 - 0.5/leverage) : price * (1 + 0.5/leverage)));
    const tp = isManual ? [] : (sig ? sig.take_profit : (side === "long"
      ? [price * (1 + 0.3/leverage), price * (1 + 0.6/leverage), price * (1 + 1.2/leverage)]
      : [price * (1 - 0.3/leverage), price * (1 - 0.6/leverage), price * (1 - 1.2/leverage)]));
    const res = W.openPosition(wallet, {
      strategy: sig ? strat!.name : "Manual", symbol, side, entry: price, size: posSize * leverage, leverage,
      stop_loss: sl, take_profit: tp, reason: sig ? sig.reason : t("log.manual_entry"),
    });
    if (res.error) pushLog(`⚠ ${res.error}`);
    else { setWallet(res.wallet); pushLog(`${side === "long" ? "🟢 LONG" : "🔴 SHORT"} ${leverage}x @ ${price.toFixed(4)} ${t("log.manual")}`); }
  };

  const closePos = (id: string) => {
    const pos = wallet.positions.find((p) => p.id === id);
    if (!pos) return;
    // Sadece pozisyonun KENDİ sembolünün geçerli fiyatıyla kapat. Farklı sembol/fiyat 0 ise
    // entry (breakeven) ile kapat — başka sembolün fiyatıyla yanlış dev zarar oluşmasını önler.
    const exit = pos.symbol === symbol && price > 0 ? price : pos.entry;
    setWallet(W.closePosition(wallet, id, exit, "Manual"));
    if (pos.symbol !== symbol) pushLog(`ℹ ${sym(pos.symbol)} ${t("log.close_other_symbol")}`);
    else pushLog(t("log.pos_closed"));
  };
  const doTopup = () => { setWallet(W.topUp(wallet, 1000)); pushLog(t("log.topup")); };
  const doReset = () => { if (confirm(t("common.confirm_reset"))) { setWallet(W.resetWallet()); setLog([]); } };

  const eq = W.equity(wallet, { [symbol]: price });
  const totalDeposit = 1000 + wallet.topups;
  const totalPnl = eq - totalDeposit;
  const stats = W.calcStats(wallet);
  const requiredMargin = posSize; // girilen değer artık doğrudan margin
  const notionalSize = posSize * leverage; // pozisyon büyüklüğü
  const quickSize = (pct: number) => Math.max(1, Math.floor(wallet.balance * pct));

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, lineHeight: 1 }}>{t("demo.title")}</h1>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>{t("demo.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a
            className="btn btn-primary"
            href={`https://sodex.com/trade/futures/${sym(symbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12 }}
          >
            ⚡ {t("demo.mainnet_trade")} ↗
          </a>
          <button className="btn btn-ghost" onClick={() => setShowStats(!showStats)} style={{ fontSize: 12 }}>
            {showStats ? t("demo.hide_stats") : t("demo.show_stats")}
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, alignItems: "center" }}>
          <Stat label={t("common.balance")} value={`$${wallet.balance.toFixed(2)}`} />
          <Stat label={t("common.equity")} value={`$${eq.toFixed(2)}`} color="var(--cyan)" />
          <Stat label={t("common.total_pnl")} value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? "var(--green)" : "var(--red)"} />
          <Stat label={t("common.roi")} value={`${totalPnl >= 0 ? "+" : ""}${((totalPnl / totalDeposit) * 100).toFixed(1)}%`} color={totalPnl >= 0 ? "var(--green)" : "var(--red)"} />
          <Stat label={t("demo.pos_trade")} value={`${wallet.positions.length} / ${stats.totalTrades}`} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={doTopup} style={{ fontSize: 11, padding: "7px 12px" }}>{t("common.top_up")}</button>
            <button className="btn btn-ghost" onClick={doReset} style={{ fontSize: 11, padding: "7px 12px" }}>{t("common.reset")}</button>
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>{t("demo.equity_curve")}</div>
          <EquityCurve history={wallet.equityHistory} startBalance={1000} />
        </div>
      </div>

      {showStats && (
        <div className="panel fade-up" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <Stat label={t("demo.win_rate")} value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? "var(--green)" : "var(--red)"} />
            <Stat label={t("demo.wins_losses")} value={`${stats.wins} / ${stats.losses}`} />
            <Stat label={t("demo.avg_win")} value={`$${stats.avgWin.toFixed(2)}`} color="var(--green)" />
            <Stat label={t("demo.avg_loss")} value={`$${stats.avgLoss.toFixed(2)}`} color="var(--red)" />
            <Stat label={t("demo.biggest_win")} value={`$${stats.biggestWin.toFixed(2)}`} color="var(--green)" />
            <Stat label={t("demo.biggest_loss")} value={`$${stats.biggestLoss.toFixed(2)}`} color="var(--red)" />
            <Stat label={t("demo.liquidations")} value={`${stats.liquidations}`} color={stats.liquidations > 0 ? "var(--purple)" : "var(--text)"} />
            <Stat label={t("demo.best_symbol")} value={stats.bestSymbol} />
            <Stat label={t("demo.best_strat")} value={stats.bestStrategy} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <div className="panel" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <span className="display" style={{ fontSize: 18 }}>{sym(symbol)}</span>
              <span className="mono" style={{ marginLeft: 10, color: "var(--text-faint)", fontSize: 12 }}>{interval}</span>
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
              {loading ? <span className="pulse">···</span> : `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`}
            </div>
          </div>
          <PriceChart candles={candles} positions={wallet.positions} symbol={symbol} indicators={indicators} />

          {/* Teknik analiz araç menüsü */}
          <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
            <button onClick={() => setToolsOpen((o) => !o)} className="mono" style={{
              display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none",
              color: "var(--text-dim)", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0,
            }}>
              <span style={{ fontSize: 14 }}>☰</span> INDICATORS
              {indicators.length > 0 && <span style={{ color: "var(--green)" }}>({indicators.length})</span>}
              <span style={{ marginLeft: 4, transform: toolsOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
            </button>
            {toolsOpen && (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {([
                  ["Overlays", [["ema20", "EMA 20"], ["ema50", "EMA 50"], ["ema200", "EMA 200"], ["sma20", "SMA 20"], ["sma50", "SMA 50"], ["sma200", "SMA 200"], ["bb", "Bollinger"], ["vwap", "VWAP"], ["ichimoku", "Ichimoku"], ["supertrend", "SuperTrend"], ["donchian", "Donchian"], ["psar", "Parabolic SAR"], ["volume", "Volume"]]],
                  ["Levels", [["fib", "Fibonacci"], ["sr", "Support/Resistance"], ["pivot", "Pivot Points"]]],
                  ["Oscillators", [["rsi", "RSI"], ["macd", "MACD"], ["stochastic", "Stochastic"], ["cci", "CCI"], ["mfi", "MFI"], ["obv", "OBV"], ["atr", "ATR"], ["williamsR", "Williams %R"], ["adx", "ADX"]]],
                ] as [string, [string, string][]][]).map(([group, items]) => (
                  <div key={group}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, letterSpacing: 1 }}>{group.toUpperCase()}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {items.map(([key, label]) => {
                        const on = indicators.includes(key);
                        return (
                          <button key={key} onClick={() => setIndicators((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key])} className="mono" style={{
                            padding: "5px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                            background: on ? "var(--green)" : "var(--bg-soft)",
                            color: on ? "#04150d" : "var(--text-dim)",
                            border: "1px solid " + (on ? "transparent" : "var(--border-glow)"),
                            fontWeight: on ? 700 : 400,
                          }}>{label}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {indicators.length > 0 && (
                  <button onClick={() => setIndicators([])} className="mono" style={{ alignSelf: "flex-start", padding: "5px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: "transparent", color: "var(--red)", border: "1px solid var(--border)" }}>
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
            <Field label={t("demo.strategy")}>
              <select value={stratId} onChange={(e) => { setStratId(e.target.value); setLastSignal(null); }} style={selStyle}>
                <option value="__manual__">{t("demo.no_strategy")}</option>
                {ALL_CATEGORIES.map((cat) => (
                  <optgroup key={cat} label={t(`cat.${cat}`)}>
                    {STRATEGIES.filter((s) => s.category === cat).map((s) => (
                      <option key={s.id} value={s.id} disabled={!s.run}>{s.name}{!s.run ? " (off-chain)" : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label={t("demo.symbol")}>
              <SymbolPicker value={symbol} markets={sodexMarkets} onChange={setSymbol} />
            </Field>
            <Field label={t("demo.timeframe")}>
              <select value={interval} onChange={(e) => setIntervalV(e.target.value)} style={selStyle}>
                {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label={`${t("demo.leverage")}: ${leverage}x`}>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {LEVERAGES.map((l) => (
                  <button key={l} onClick={() => setLeverage(l)} style={{
                    flex: "1 1 auto", minWidth: 32, padding: "7px 4px",
                    background: leverage === l ? (l >= 15 ? "var(--red)" : l >= 10 ? "var(--amber)" : "var(--green)") : "var(--bg-soft)",
                    color: leverage === l ? "#04150d" : "var(--text-dim)",
                    border: "1px solid " + (leverage === l ? "transparent" : "var(--border-glow)"),
                    borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{l}x</button>
                ))}
              </div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label={t("demo.pos_margin")}>
              <input type="number" value={posSize} onChange={(e) => setPosSize(Math.max(1, +e.target.value))} style={selStyle} />
              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>
                {t("demo.notional_short")}: ${notionalSize.toLocaleString()} ({leverage}x) · {((requiredMargin / wallet.balance) * 100 || 0).toFixed(1)}% {t("demo.of_balance")}
              </div>
            </Field>
            <Field label={t("demo.quick_size")}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0.05, 0.1, 0.25, 0.5].map((p) => (
                  <button key={p} onClick={() => setPosSize(quickSize(p))} style={{
                    flex: 1, padding: "8px 4px", background: "var(--bg-soft)", color: "var(--text-dim)",
                    border: "1px solid var(--border-glow)", borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer",
                  }}>{(p * 100).toFixed(0)}%</button>
                ))}
              </div>
            </Field>
          </div>

          {!isManual && lastSignal && (
            <div style={{ padding: "10px 12px", background: "var(--bg-soft)", borderRadius: 6, marginBottom: 14, borderLeft: `3px solid ${lastSignal.signal === "long" ? "var(--green)" : lastSignal.signal === "short" ? "var(--red)" : "var(--text-faint)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span className={`mono ${lastSignal.signal}`} style={{ fontSize: 16, fontWeight: 700 }}>{lastSignal.signal.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{lastSignal.reason}</span>
              </div>
              {lastSignal.signal !== "neutral" && (
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                  {t("strat.entry")} {lastSignal.entry.toFixed(4)} · SL {lastSignal.stop_loss.toFixed(4)} · TP {lastSignal.take_profit.map((t: number) => t.toFixed(4)).join(" / ")}
                </div>
              )}
            </div>
          )}

          {isManual ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)", flexBasis: "100%", marginBottom: 2 }}>{t("demo.manual_hint")}</span>
              <button className="btn btn-primary" onClick={() => manualOpen("long")} disabled={loading}>🟢 LONG {leverage}x</button>
              <button className="btn btn-danger" onClick={() => manualOpen("short")} disabled={loading}>🔴 SHORT {leverage}x</button>
            </div>
          ) : !runnable ? (
            <div className="panel" style={{ padding: 14, background: "rgba(255,184,0,.06)", borderColor: "rgba(255,184,0,.3)" }}>
              <span className="mono" style={{ fontSize: 12.5, color: "var(--amber)" }}>⚠ {strat?.offchainNote}</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn" onClick={testSignal} disabled={loading}>{t("demo.test_signal")}</button>
              <button className="btn btn-primary" onClick={() => manualOpen("long")} disabled={loading}>🟢 LONG {leverage}x</button>
              <button className="btn btn-danger" onClick={() => manualOpen("short")} disabled={loading}>🔴 SHORT {leverage}x</button>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", cursor: "pointer" }}>
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />
                <span style={{ fontSize: 13, color: auto ? "var(--green)" : "var(--text-dim)", fontWeight: 600 }}>
                  {auto ? t("demo.auto_on") : t("demo.auto")}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <h3 className="display" style={{ fontSize: 15, marginBottom: 12 }}>{t("demo.open_pos")} ({wallet.positions.length})</h3>
          {wallet.positions.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{t("demo.no_open_pos")}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: "var(--text-faint)", textAlign: "left" }}>
                    <th style={th}>{t("demo.strategy")}</th><th style={th}>{t("demo.symbol")}</th><th style={th}>{t("tbl.side")}</th>
                    <th style={th}>{t("tbl.lev")}</th><th style={th}>{t("strat.entry")}</th><th style={th}>{t("demo.notional").replace(" ($)","")}</th>
                    <th style={th}>{t("demo.margin")}</th><th style={th}>{t("tbl.liq")}</th><th style={th}>P&L</th><th style={th}>ROE</th><th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.positions.map((p) => {
                    const px = p.symbol === symbol ? price : (extPrices[p.symbol] ?? 0);
                    const known = px > 0;
                    const pnl = known ? W.calcPnl(p, px) : 0;
                    const roe = known ? W.calcRoe(p, px) : 0;
                    const liqDist = known ? Math.abs((px - p.liquidation) / px) * 100 : 0;
                    return (
                      <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={td}>{p.strategy}{p.partialClosed && <span className="mono" style={{ marginLeft: 6, fontSize: 9, color: "var(--green)", border: "1px solid var(--green)", borderRadius: 3, padding: "1px 4px" }}>½ TP1·BE</span>}</td>
                        <td style={td} className="mono">{sym(p.symbol)}</td>
                        <td style={td}><span className={`mono ${p.side}`}>{p.side.toUpperCase()}</span></td>
                        <td style={td} className="mono"><span style={{ color: p.leverage >= 15 ? "var(--red)" : p.leverage >= 10 ? "var(--amber)" : "var(--green)" }}>{p.leverage}x</span></td>
                        <td style={td} className="mono">{p.entry.toFixed(4)}</td>
                        <td style={td} className="mono">${p.size}</td>
                        <td style={td} className="mono">${p.margin.toFixed(2)}</td>
                        <td style={{ ...td, color: liqDist < 5 && liqDist > 0 ? "var(--red)" : "var(--text-dim)" }} className="mono">{p.liquidation.toFixed(4)}{liqDist > 0 && <span style={{ fontSize: 10 }}> ({liqDist.toFixed(1)}%)</span>}</td>
                        <td style={td} className={`mono ${pnl >= 0 ? "long" : "short"}`}>{known ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` : "—"}</td>
                        <td style={td} className={`mono ${roe >= 0 ? "long" : "short"}`}>{known ? `${roe >= 0 ? "+" : ""}${roe.toFixed(1)}%` : "—"}</td>
                        <td style={td}><button className="btn btn-ghost" onClick={() => closePos(p.id)} style={{ padding: "4px 10px", fontSize: 11 }}>{t("tbl.close")}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <div className="panel" style={{ padding: 16 }}>
            <h3 className="display" style={{ fontSize: 15, marginBottom: 12 }}>{t("demo.history")} ({wallet.history.length})</h3>
            {wallet.history.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{t("demo.no_history")}</p>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {wallet.history.map((tr) => (
                  <div key={tr.id + tr.closeTime} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <span className={`mono ${tr.side}`}>{tr.side.toUpperCase()}</span>
                      <span className="mono" style={{ marginLeft: 6 }}>{sym(tr.symbol)}</span>
                      <span className="mono" style={{ marginLeft: 6, color: "var(--text-faint)" }}>{tr.leverage}x</span>
                      <div style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 2 }}>{tr.closeReason}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`mono ${tr.pnl >= 0 ? "long" : "short"}`}>{tr.pnl >= 0 ? "+" : ""}${tr.pnl.toFixed(2)}</span>
                      <div className="mono" style={{ color: tr.roe >= 0 ? "var(--green-dim)" : "var(--red-dim)", fontSize: 10 }}>ROE {tr.roe >= 0 ? "+" : ""}{tr.roe.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 16 }}>
            <h3 className="display" style={{ fontSize: 15, marginBottom: 12 }}>{t("common.live_log")}</h3>
            <div style={{ maxHeight: 320, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
              {log.length === 0 ? <p style={{ color: "var(--text-faint)" }}>—</p> :
                log.map((l, i) => <div key={i} style={{ padding: "3px 0", color: "var(--text-dim)", borderBottom: "1px solid var(--bg-soft)" }}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const selStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", background: "var(--bg-soft)", border: "1px solid var(--border-glow)",
  borderRadius: 6, color: "var(--text)", fontSize: 13,
};
const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 500, fontSize: 10, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "8px 8px" };

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 40 }}>Loading...</div>}>
      <DemoInner />
    </Suspense>
  );
}
