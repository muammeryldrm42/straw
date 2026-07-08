"use client";
import { useState, useEffect, useRef } from "react";
import { Candle } from "@/lib/indicators";
import { runUserStrategy, DEFAULT_USER_CODE } from "@/lib/sandbox";
import * as W from "@/lib/wallet";
import PriceChart from "@/components/PriceChart";
import { useT } from "@/lib/i18n";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "WIFUSDT", "PEPEUSDT"];
const INTERVALS = ["5m", "15m", "1h", "4h", "1d"];
const LEVERAGES = [1, 2, 5, 10, 15, 20, 25];

export default function Playground() {
  const { t } = useT();
  const [code, setCode] = useState(DEFAULT_USER_CODE);
  const [symbol, setSymbol] = useState("SOLUSDT");
  const [interval, setIntervalV] = useState("15m");
  const [leverage, setLeverage] = useState(5);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState(0);
  const [wallet, setWallet] = useState<W.WalletState>({ balance: 1000, positions: [], history: [], topups: 0, equityHistory: [] });
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [posSize, setPosSize] = useState(100);
  const walletRef = useRef(wallet); walletRef.current = wallet;
  const codeRef = useRef(code); codeRef.current = code;
  const candlesRef = useRef(candles); candlesRef.current = candles;
  const levRef = useRef(leverage); levRef.current = leverage;

  useEffect(() => { setWallet(W.loadWallet()); }, []);
  const pushLog = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${m}`, ...l].slice(0, 40));

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
      } else if (d.error) pushLog(`⚠ ${d.error}`);
    } catch { pushLog(`⚠ ${t("log.fetch_fail")}`); }
  };
  useEffect(() => { fetchData(); const tm = setInterval(fetchData, 10000); return () => clearInterval(tm); /* eslint-disable-next-line */ }, [symbol, interval]);

  const run = async () => {
    if (candles.length < 50) { pushLog(`⚠ ${t("log.insufficient_data")}`); return; }
    setRunning(true);
    const res = await runUserStrategy(code, candles);
    setRunning(false);
    if (res.ok) { setResult(res.signal); pushLog(`✓ ${res.signal!.signal.toUpperCase()} · ${res.signal!.reason}`); }
    else { setResult(null); pushLog(`✗ Error: ${res.error}`); }
  };

  useEffect(() => {
    if (!auto) return;
    const tm = setInterval(async () => {
      if (candlesRef.current.length < 50) return;
      const res = await runUserStrategy(codeRef.current, candlesRef.current);
      if (res.ok && res.signal) {
        setResult(res.signal);
        const w = walletRef.current;
        const sig = res.signal;
        const hasOpen = w.positions.some((p) => p.symbol === symbol && p.strategy === "Custom");
        if ((sig.signal === "long" || sig.signal === "short") && !hasOpen && sig.entry > 0) {
          const r2 = W.openPosition(w, {
            strategy: "Custom", symbol, side: sig.signal, entry: price, size: posSize, leverage: levRef.current,
            stop_loss: sig.stop_loss, take_profit: sig.take_profit, reason: sig.reason,
          });
          if (r2.error) pushLog(`⚠ ${r2.error}`);
          else { setWallet(r2.wallet); pushLog(`${sig.signal === "long" ? "🟢" : "🔴"} ${sig.signal.toUpperCase()} ${levRef.current}x @ ${price.toFixed(4)}`); }
        }
      }
    }, 8000);
    return () => clearInterval(tm);
    // eslint-disable-next-line
  }, [auto, symbol, posSize, price]);

  const openManual = (side: "long" | "short") => {
    const sl = result && result.signal === side ? result.stop_loss : (side === "long" ? price * (1 - 0.5/leverage) : price * (1 + 0.5/leverage));
    const tp = result && result.signal === side ? result.take_profit : (side === "long"
      ? [price * (1 + 0.3/leverage), price * (1 + 0.6/leverage)]
      : [price * (1 - 0.3/leverage), price * (1 - 0.6/leverage)]);
    const r = W.openPosition(wallet, { strategy: "Custom", symbol, side, entry: price, size: posSize, leverage, stop_loss: sl, take_profit: tp, reason: result?.reason || t("log.manual_entry") });
    if (r.error) pushLog(`⚠ ${r.error}`);
    else { setWallet(r.wallet); pushLog(`${side === "long" ? "🟢" : "🔴"} ${side.toUpperCase()} ${leverage}x @ ${price.toFixed(4)}`); }
  };
  const closePos = (id: string) => { setWallet(W.closePosition(wallet, id, price, "Manual")); };
  const doTopup = () => { setWallet(W.topUp(wallet, 1000)); pushLog(t("log.topup")); };

  const eq = W.equity(wallet, { [symbol]: price });
  const requiredMargin = posSize / leverage;

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>{t("pg.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 18, fontSize: 13 }}>{t("pg.subtitle")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <div className="panel" style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="mono" style={{ fontSize: 12, color: "var(--green)" }}>{t("pg.code_label")}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{t("pg.sandbox_note")}</span>
          </div>
          <textarea
            value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
            style={{
              width: "100%", height: 480, padding: 16, background: "var(--bg-soft)", border: "none",
              color: "var(--text)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.6, resize: "vertical", outline: "none",
            }}
          />
          <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={run} disabled={running}>{running ? t("pg.running") : t("pg.run")}</button>
            <button className="btn btn-ghost" onClick={() => setCode(DEFAULT_USER_CODE)} style={{ fontSize: 12 }}>{t("pg.reset_code")}</button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--green)" }} />
              <span style={{ fontSize: 13, color: auto ? "var(--green)" : "var(--text-dim)", fontWeight: 600 }}>{auto ? t("demo.auto_on") : t("demo.auto")}</span>
            </label>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel" style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{t("common.balance")}</div><div className="mono" style={{ fontSize: 17, fontWeight: 700 }}>${wallet.balance.toFixed(2)}</div></div>
            <div><div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{t("common.equity")}</div><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--cyan)" }}>${eq.toFixed(2)}</div></div>
            <button className="btn btn-primary" onClick={doTopup} style={{ fontSize: 11, padding: "6px 8px" }}>{t("common.top_up")}</button>
            <button className="btn btn-ghost" onClick={() => { if (confirm(t("common.confirm_reset"))) { setWallet(W.resetWallet()); setLog([]); } }} style={{ fontSize: 11, padding: "6px 8px" }}>{t("common.reset")}</button>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={selStyle}>{SYMBOLS.map((s) => <option key={s}>{s}</option>)}</select>
              <select value={interval} onChange={(e) => setIntervalV(e.target.value)} style={selStyle}>{INTERVALS.map((i) => <option key={i}>{i}</option>)}</select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>{t("demo.leverage").toUpperCase()} {leverage}x</div>
              <div style={{ display: "flex", gap: 3 }}>
                {LEVERAGES.map((l) => (
                  <button key={l} onClick={() => setLeverage(l)} style={{
                    flex: 1, padding: "6px 2px",
                    background: leverage === l ? (l >= 15 ? "var(--red)" : l >= 10 ? "var(--amber)" : "var(--green)") : "var(--bg-soft)",
                    color: leverage === l ? "#04150d" : "var(--text-dim)",
                    border: "1px solid " + (leverage === l ? "transparent" : "var(--border-glow)"),
                    borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, cursor: "pointer",
                  }}>{l}x</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{symbol}</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Notional $</span>
              <input type="number" value={posSize} onChange={(e) => setPosSize(Math.max(1, +e.target.value))} style={{ ...selStyle, width: 90 }} />
              <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{t("demo.margin").toLowerCase()} ${requiredMargin.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-primary" onClick={() => openManual("long")} style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>🟢 LONG</button>
              <button className="btn btn-danger" onClick={() => openManual("short")} style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>🔴 SHORT</button>
            </div>
          </div>

          {result && (
            <div className="panel" style={{ padding: 14 }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 4 }}>{t("demo.last_signal").toUpperCase()}</div>
              <span className={`mono ${result.signal}`} style={{ fontSize: 16, fontWeight: 700 }}>{result.signal.toUpperCase()}</span>
              <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{result.reason}</p>
              {result.signal !== "neutral" && (
                <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 6 }}>
                  {t("strat.entry")} {result.entry.toFixed(4)} · SL {result.stop_loss.toFixed(4)}<br />
                  TP {result.take_profit.map((tp: number) => tp.toFixed(4)).join(" / ")}
                </div>
              )}
            </div>
          )}

          <div className="panel" style={{ padding: 14 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6 }}>{t("common.live_log").toUpperCase()}</div>
            <div style={{ maxHeight: 140, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {log.length === 0 ? <span style={{ color: "var(--text-faint)" }}>—</span> :
                log.map((l, i) => <div key={i} style={{ padding: "3px 0", color: "var(--text-dim)" }}>{l}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 14, marginTop: 16 }}>
        <div className="display" style={{ fontSize: 14, marginBottom: 10 }}>{symbol.replace("USDT", "/USDT")} · {interval}</div>
        <PriceChart candles={candles} positions={wallet.positions} symbol={symbol} />
      </div>

      {wallet.positions.length > 0 && (
        <div className="panel" style={{ padding: 16, marginTop: 16 }}>
          <h3 className="display" style={{ fontSize: 14, marginBottom: 10 }}>{t("demo.open_pos")}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {wallet.positions.map((p) => {
                  const pnl = p.symbol === symbol ? W.calcPnl(p, price) : 0;
                  const roe = p.symbol === symbol ? W.calcRoe(p, price) : 0;
                  return (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: 8 }}>{p.strategy}</td>
                      <td style={{ padding: 8 }} className="mono">{p.symbol.replace("USDT", "")}</td>
                      <td style={{ padding: 8 }}><span className={`mono ${p.side}`}>{p.side.toUpperCase()}</span></td>
                      <td style={{ padding: 8 }} className="mono">{p.leverage}x</td>
                      <td style={{ padding: 8 }} className="mono">{p.entry.toFixed(4)}</td>
                      <td style={{ padding: 8 }} className="mono">${p.size}</td>
                      <td style={{ padding: 8, color: "var(--purple)" }} className="mono">liq {p.liquidation.toFixed(4)}</td>
                      <td style={{ padding: 8 }} className={`mono ${pnl >= 0 ? "long" : "short"}`}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</td>
                      <td style={{ padding: 8 }} className={`mono ${roe >= 0 ? "long" : "short"}`}>{roe >= 0 ? "+" : ""}{roe.toFixed(1)}%</td>
                      <td style={{ padding: 8 }}><button className="btn btn-ghost" onClick={() => closePos(p.id)} style={{ padding: "4px 10px", fontSize: 11 }}>{t("tbl.close")}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

const selStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "var(--bg-soft)", border: "1px solid var(--border-glow)",
  borderRadius: 6, color: "var(--text)", fontSize: 12,
};
