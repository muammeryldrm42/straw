"use client";
import { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { STRATEGIES, CATEGORY_LABELS } from "@/lib/registry";
import { Candle } from "@/lib/indicators";
import { useT } from "@/lib/i18n";
import { useSodexMarkets } from "@/lib/useSodexMarkets";
import { SymbolPicker } from "@/components/SymbolPicker";

const dsym = (s: string) => s.replace("SODEX:", "");

const INTERVALS = ["5m", "15m", "1h", "4h", "1d"];

interface Hit {
  stratId: string;
  name: string;
  category: string;
  symbol: string;
  signal: "long" | "short";
  confidence: number;
  entry: number;
  stop_loss: number;
  take_profit: number[];
  reason: string;
}

interface SsiResult { ticker: string; name: string; price: number; change: number; momentum: number; coinScore: number; btcScore: number; scanned: number; coins: { label: string; momentum: number | null }[]; }

// SSI endeksleri ve onları oluşturan coinler. SoDEX perp'te olanlar "SODEX:X-USD",
// olmayanlar Binance/Hyperliquid'den "XUSDT" (klines route otomatik kaynak seçer).
const SSI_DEFS: { ticker: string; name: string; coins: { sym: string; label: string }[] }[] = [
  { ticker: "MAG7ssi", name: "MAG7.ssi", coins: [
    { sym: "SODEX:BTC-USD", label: "BTC" }, { sym: "SODEX:ETH-USD", label: "ETH" }, { sym: "SODEX:BNB-USD", label: "BNB" }, { sym: "SODEX:XRP-USD", label: "XRP" }, { sym: "SODEX:SOL-USD", label: "SOL" }, { sym: "SODEX:DOGE-USD", label: "DOGE" }, { sym: "SODEX:ADA-USD", label: "ADA" },
  ] },
  { ticker: "DEFIssi", name: "DEFI.ssi", coins: [
    { sym: "SODEX:HYPE-USD", label: "HYPE" }, { sym: "SODEX:LINK-USD", label: "LINK" }, { sym: "SODEX:ONDO-USD", label: "ONDO" }, { sym: "SODEX:UNI-USD", label: "UNI" }, { sym: "SKYUSDT", label: "SKY" }, { sym: "MORPHOUSDT", label: "MORPHO" }, { sym: "SODEX:AAVE-USD", label: "AAVE" }, { sym: "SODEX:ENA-USD", label: "ENA" }, { sym: "JUPUSDT", label: "JUP" }, { sym: "CAKEUSDT", label: "CAKE" },
  ] },
  { ticker: "MEMEssi", name: "MEME.ssi", coins: [
    { sym: "SODEX:DOGE-USD", label: "DOGE" }, { sym: "MUSDT", label: "M" }, { sym: "SODEX:1000SHIB-USD", label: "SHIB" }, { sym: "SODEX:1000PEPE-USD", label: "PEPE" }, { sym: "SODEX:PUMP-USD", label: "PUMP" }, { sym: "SODEX:PENGU-USD", label: "PENGU" }, { sym: "SODEX:TRUMP-USD", label: "TRUMP" }, { sym: "SODEX:1000BONK-USD", label: "BONK" }, { sym: "SPXUSDT", label: "SPX" }, { sym: "FLOKIUSDT", label: "FLOKI" },
  ] },
];

// Birleşik momentum skorunu (-1..+1) 5 kademeye böler.
function momentumTier(m: number): { key: string; color: string; emoji: string } {
  if (m >= 0.4) return { key: "ssi.strong_buy", color: "var(--green)", emoji: "🚀" };
  if (m >= 0.12) return { key: "ssi.buy", color: "var(--green)", emoji: "📈" };
  if (m > -0.12) return { key: "ssi.neutral", color: "var(--text-dim)", emoji: "➖" };
  if (m > -0.4) return { key: "ssi.sell", color: "var(--red)", emoji: "📉" };
  return { key: "ssi.strong_sell", color: "var(--red)", emoji: "🔻" };
}

function SignalsInner() {
  const { t } = useT();
  const params = useSearchParams();
  const [symbol, setSymbol] = useState(params.get("symbol") || "SODEX:BTC-USD");
  const sodexMarkets = useSodexMarkets();
  // SymbolPicker listesi: perp marketleri + spot-only SOSO (klines yedek kaynaktan: SOSOUSDT)
  const pickerMarkets = useMemo(() => [...sodexMarkets, { symbol: "SOSO-USD", base: "SOSO", maxLeverage: null, raw: "SOSOUSDT" }], [sodexMarkets]);
  const [interval, setIntervalV] = useState("15m");
  const [scope, setScope] = useState<"single" | "multi" | "ssi">(params.get("scope") === "ssi" ? "ssi" : params.get("scope") === "multi" ? "multi" : "single");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Hit[] | null>(null);
  const [multiResults, setMultiResults] = useState<Record<string, Hit[]> | null>(null);
  const [ssiResults, setSsiResults] = useState<Record<string, SsiResult[]> | null>(null);
  const [ssiExpanded, setSsiExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("1d");

  const runnable = STRATEGIES.filter((s) => typeof s.run === "function");

  const scan = async () => {
    setScanning(true);
    setResults(null);
    setMultiResults(null);

    // ALL TIME (yalnızca This symbol): her zaman dilimini ayrı tara
    if (scope === "single" && interval === "all") {
      const byInterval: Record<string, Hit[]> = {};
      for (let k = 0; k < INTERVALS.length; k++) {
        const iv = INTERVALS[k];
        setProgress(`${dsym(symbol)} · ${iv} (${k + 1}/${INTERVALS.length})`);
        let candles: Candle[] = [];
        try {
          const r = await fetch(`/api/klines?symbol=${symbol}&interval=${iv}&limit=300`);
          const d = await r.json();
          candles = d.candles || [];
        } catch { /* atla */ }
        const hits: Hit[] = [];
        if (candles.length >= 60) {
          for (const s of runnable) {
            try {
              const sig = s.run!(candles);
              if (sig && (sig.signal === "long" || sig.signal === "short")) {
                hits.push({
                  stratId: s.id, name: s.name, category: s.category, symbol,
                  signal: sig.signal, confidence: sig.confidence ?? 0,
                  entry: sig.entry, stop_loss: sig.stop_loss, take_profit: sig.take_profit || [],
                  reason: sig.reason,
                });
              }
            } catch { /* atla */ }
          }
        }
        hits.sort((a, b) => b.confidence - a.confidence);
        byInterval[iv] = hits;
        await new Promise((res) => setTimeout(res, 0));
      }
      setMultiResults(byInterval);
      setActiveTab("1d");
      setProgress("");
      setScanning(false);
      return;
    }

    const symbols = scope === "single" ? [symbol] : sodexMarkets.map((m) => `SODEX:${m.symbol}`);
    const hits: Hit[] = [];
    const BATCH = 8; // aynı anda 8 sembol fetch'i (tümünü taramayı hızlandırır)
    let done = 0;
    for (let i = 0; i < symbols.length; i += BATCH) {
      const chunk = symbols.slice(i, i + BATCH);
      // klineları paralel çek
      const fetched = await Promise.all(
        chunk.map(async (symb) => {
          try {
            const r = await fetch(`/api/klines?symbol=${symb}&interval=${interval}&limit=300`);
            const d = await r.json();
            return { symb, candles: (d.candles || []) as Candle[] };
          } catch {
            return { symb, candles: [] as Candle[] };
          }
        })
      );
      // her sembol için stratejileri çalıştır
      for (const { symb, candles } of fetched) {
        done++;
        if (candles.length < 60) continue;
        for (const s of runnable) {
          try {
            const sig = s.run!(candles);
            if (sig && (sig.signal === "long" || sig.signal === "short")) {
              hits.push({
                stratId: s.id, name: s.name, category: s.category, symbol: symb,
                signal: sig.signal, confidence: sig.confidence ?? 0,
                entry: sig.entry, stop_loss: sig.stop_loss, take_profit: sig.take_profit || [],
                reason: sig.reason,
              });
            }
          } catch { /* stratejiyi atla */ }
        }
      }
      setProgress(`${t("signals.fetching")} ${done}/${symbols.length}`);
      // UI'ın nefes alması için
      await new Promise((res) => setTimeout(res, 0));
    }
    hits.sort((a, b) => b.confidence - a.confidence);
    setResults(hits);
    setProgress("");
    setScanning(false);
  };

  // Bir coin için 281 stratejiyi belirli zaman diliminde çalıştırıp momentum skoru döndürür: (long-short)/(long+short)
  const coinMomentum = async (sym: string, iv: string): Promise<number | null> => {
    try {
      const r = await fetch(`/api/klines?symbol=${encodeURIComponent(sym)}&interval=${iv}&limit=300`);
      const d = await r.json();
      const candles: Candle[] = d.candles || [];
      if (candles.length < 60) return null;
      let long = 0, short = 0;
      for (const s of runnable) {
        try { const sig = s.run!(candles); if (sig?.signal === "long") long++; else if (sig?.signal === "short") short++; } catch { /* atla */ }
      }
      const tot = long + short;
      return tot > 0 ? (long - short) / tot : 0;
    } catch { return null; }
  };

  // SSI momentum taraması: coinlerin sinyalleri + BTC (piyasa lideri) + SSI'nin güncel spot durumu.
  // interval "all" ise her zaman dilimi (1d→5m) için ayrı tarar.
  const scanSSI = async () => {
    setScanning(true); setSsiResults(null); setResults(null); setMultiResults(null);
    // SSI güncel spot durumu (SoDEX spot, market-tickers'tan)
    const spotMap: Record<string, { price: number; change: number }> = {};
    try {
      const mr = await fetch("/api/market-tickers");
      const md = await mr.json();
      (md.rows || []).forEach((row: any) => { if (row.category === "ssi") spotMap[row.base] = { price: row.price, change: row.change }; });
    } catch { /* spot yoksa 0 */ }
    const intervals = interval === "all" ? ["1d", "4h", "1h", "15m", "5m"] : [interval];
    const byInterval: Record<string, SsiResult[]> = {};
    for (const iv of intervals) {
      // BTC durumu = piyasa lideri (o zaman dilimi için)
      setProgress(`${iv} · BTC`);
      const btcScore = (await coinMomentum("SODEX:BTC-USD", iv)) ?? 0;
      const out: SsiResult[] = [];
      for (const ssi of SSI_DEFS) {
        setProgress(`${iv} · ${ssi.name}`);
        const scores = await Promise.all(ssi.coins.map((c) => coinMomentum(c.sym, iv)));
        const coinList = ssi.coins.map((c, i) => ({ label: c.label, momentum: scores[i] }));
        const valid = scores.filter((x) => x !== null) as number[];
        const coinScore = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
        const spot = spotMap[ssi.ticker];
        const spotScore = spot ? Math.tanh((spot.change || 0) / 6) : 0;
        // ağırlıklı birleşik momentum: coin sinyalleri %55, BTC/piyasa %25, SSI güncel durum %20
        const momentum = 0.55 * coinScore + 0.25 * btcScore + 0.20 * spotScore;
        out.push({ ticker: ssi.ticker, name: ssi.name, price: spot?.price ?? 0, change: spot?.change ?? 0, momentum, coinScore, btcScore, scanned: valid.length, coins: coinList });
      }
      byInterval[iv] = out;
    }
    setSsiResults(byInterval);
    setProgress(""); setScanning(false);
  };

  const longs = results?.filter((h) => h.signal === "long").length ?? 0;
  const shorts = results?.filter((h) => h.signal === "short").length ?? 0;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 className="display" style={{ fontSize: 26 }}>{t("signals.title")}</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>{t("signals.subtitle")}</p>
        <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 8, lineHeight: 1.5, maxWidth: 760 }}>⚠️ {t("signals.disclaimer")}</p>
      </div>

      {/* Kontroller */}
      <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Field label={t("signals.scope")}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["single", "multi", "ssi"] as const).map((sc) => (
                <button key={sc} onClick={() => { setScope(sc); if (sc === "multi" && interval === "all") setIntervalV("1d"); }} disabled={scanning} style={{
                  flex: 1, padding: "9px 6px", borderRadius: 5, cursor: scanning ? "default" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  background: scope === sc ? "var(--green)" : "var(--bg-soft)",
                  color: scope === sc ? "#04150d" : "var(--text-dim)",
                  border: "1px solid " + (scope === sc ? "transparent" : "var(--border-glow)"),
                }}>{sc === "single" ? t("signals.scope_single") : sc === "multi" ? t("signals.scope_multi") : t("signals.scope_ssi")}</button>
              ))}
            </div>
          </Field>
          {scope === "single" && (
            <Field label={t("demo.symbol") || "Symbol"}>
              <SymbolPicker value={symbol} markets={pickerMarkets} onChange={setSymbol} disabled={scanning} />
            </Field>
          )}
          <Field label={t("signals.interval")}>
            <select value={interval} onChange={(e) => setIntervalV(e.target.value)} disabled={scanning} style={selStyle}>
              {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
              {(scope === "single" || scope === "ssi") && <option value="all">⏱ All Time</option>}
            </select>
          </Field>
          <Field label={"\u00A0"}>
            <button className="btn btn-primary" onClick={scope === "ssi" ? scanSSI : scan} disabled={scanning} style={{ width: "100%" }}>
              {scanning ? <span className="pulse">{t("signals.scanning")}</span> : `⚡ ${t("signals.scan")}`}
            </button>
          </Field>
        </div>
        {scanning && progress && (
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10 }}>{progress}</div>
        )}
        <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 10 }}>
          {runnable.length} {t("signals.strategies_scanned")} · {scope === "multi" ? `${sodexMarkets.length} ${t("signals.symbols")}` : scope === "ssi" ? "3 SSI" : dsym(symbol)}
        </div>
      </div>

      {/* SSI Signals momentum sonuçları */}
      {scope === "ssi" && ssiResults && (
        <div style={{ marginBottom: 18 }}>
          <div className="display" style={{ fontSize: 15, marginBottom: 10 }}>🧭 {t("ssi.title")}</div>
          {["1d", "4h", "1h", "15m", "5m"].filter((iv) => ssiResults![iv]).map((iv) => (
            <div key={iv} style={{ marginBottom: 18 }}>
              <div className="mono" style={{ fontSize: 12, letterSpacing: 1, color: "var(--accent)", marginBottom: 8 }}>⏱ {iv.toUpperCase()}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {ssiResults![iv].map((s) => {
                  const tier = momentumTier(s.momentum);
                  const pct = Math.round(((Math.max(-1, Math.min(1, s.momentum)) + 1) / 2) * 100);
                  const ckey = `${iv}-${s.ticker}`;
                  const open = ssiExpanded.has(ckey);
                  return (
                    <div key={ckey} onClick={() => setSsiExpanded((prev) => { const n = new Set(prev); n.has(ckey) ? n.delete(ckey) : n.add(ckey); return n; })} className="panel" style={{ padding: 16, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                        {s.price > 0 && (
                          <span className="mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
                            ${s.price.toFixed(s.price < 1 ? 4 : 2)} <span style={{ color: s.change >= 0 ? "var(--green)" : "var(--red)" }}>{s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%</span>
                          </span>
                        )}
                      </div>
                      <div className="mono" style={{ fontSize: 17, color: tier.color, margin: "14px 0 12px" }}>{tier.emoji} {t(tier.key)}</div>
                      <div style={{ position: "relative", height: 8, borderRadius: 4, background: "linear-gradient(90deg, rgba(255,70,70,.45), rgba(107,125,147,.2) 50%, rgba(0,230,150,.45))" }}>
                        <div style={{ position: "absolute", left: `${pct}%`, top: -3, width: 3, height: 14, background: "var(--text)", borderRadius: 2, transform: "translateX(-50%)" }} />
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                        <span>{t("ssi.bearish")}</span><span>{t("ssi.bullish")}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{s.scanned} {t("ssi.coins_scanned")}</span>
                        <span style={{ color: "var(--accent)" }}>{open ? `▲ ${t("ssi.hide")}` : `▼ ${t("ssi.detail")}`}</span>
                      </div>
                      {open && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-glow)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
                          {s.coins.map((c) => {
                            const dir = c.momentum === null ? "skip" : c.momentum > 0.1 ? "up" : c.momentum < -0.1 ? "down" : "flat";
                            const col = dir === "up" ? "var(--green)" : dir === "down" ? "var(--red)" : "var(--text-faint)";
                            const lbl = dir === "up" ? t("ssi.bullish") : dir === "down" ? t("ssi.bearish") : dir === "flat" ? t("ssi.neutral") : "—";
                            return (
                              <div key={c.label} className="mono" style={{ fontSize: 11, display: "flex", justifyContent: "space-between", gap: 6 }}>
                                <span style={{ color: "var(--text-dim)" }}>{c.label}</span>
                                <span style={{ color: col }}>{lbl}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="panel" style={{ padding: 18, marginTop: 16 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1, color: "var(--accent)", marginBottom: 10 }}>ⓘ {t("ssi.info_title")}</div>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7, margin: 0 }}>{t("ssi.info_body")}</p>
            <p style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>{t("ssi.info_disclaimer")}</p>
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {results && results.length > 0 && (() => {
        const bySym: Record<string, { long: number; short: number }> = {};
        results.forEach((h) => { (bySym[h.symbol] ||= { long: 0, short: 0 })[h.signal]++; });
        const conf = Object.entries(bySym)
          .map(([sym, c]) => ({ sym, long: c.long, short: c.short, net: c.long - c.short, strength: Math.max(c.long, c.short) }))
          .filter((c) => c.strength >= 2)
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
        if (!conf.length) return null;
        return (
          <div style={{ marginBottom: 18 }}>
            <div className="display" style={{ fontSize: 15, marginBottom: 8 }}>🔥 {t("signals.confluence")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {conf.map((c) => {
                const dir = c.net >= 0 ? "long" : "short";
                const col = dir === "long" ? "var(--green)" : "var(--red)";
                return (
                  <div key={c.sym} className="panel" style={{ padding: "12px 14px", borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontWeight: 700 }}>{dsym(c.sym)}</span>
                      <span className="mono" style={{ color: col, fontWeight: 700, fontSize: 13 }}>{dir === "long" ? "▲ LONG" : "▼ SHORT"}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                      <span style={{ color: "var(--green)" }}>{c.long} LONG</span> · <span style={{ color: "var(--red)" }}>{c.short} SHORT</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>
                      {t("signals.conf_strength")}: {c.strength} {t("signals.conf_agree")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* All Time: her zaman dilimi için confluence kartı (sekmesiz) */}
      {multiResults && (() => {
        const conf = INTERVALS
          .map((iv) => {
            const hits = multiResults[iv] || [];
            const long = hits.filter((h) => h.signal === "long").length;
            const short = hits.filter((h) => h.signal === "short").length;
            return { iv, long, short, strength: Math.max(long, short), net: long - short };
          })
          .filter((c) => c.strength >= 2);
        if (!conf.length) return null;
        return (
          <div style={{ marginBottom: 18 }}>
            <div className="display" style={{ fontSize: 15, marginBottom: 8 }}>🔥 {t("signals.confluence")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {conf.map((c) => {
                const dir = c.net >= 0 ? "long" : "short";
                const col = dir === "long" ? "var(--green)" : "var(--red)";
                return (
                  <div key={c.iv} className="panel" style={{ padding: "12px 14px", borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono" style={{ fontWeight: 700 }}>{dsym(symbol)} · {c.iv}</span>
                      <span className="mono" style={{ color: col, fontWeight: 700, fontSize: 13 }}>{dir === "long" ? "▲ LONG" : "▼ SHORT"}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
                      <span style={{ color: "var(--green)" }}>{c.long} LONG</span> · <span style={{ color: "var(--red)" }}>{c.short} SHORT</span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>
                      {t("signals.conf_strength")}: {c.strength} {t("signals.conf_agree")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {results && (
        <>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <span className="display" style={{ fontSize: 15 }}>
              {results.length} {t("signals.found")}
            </span>
            {results.length > 0 && (
              <span className="mono" style={{ fontSize: 12 }}>
                <span style={{ color: "var(--green)" }}>{longs} LONG</span> · <span style={{ color: "var(--red)" }}>{shorts} SHORT</span>
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="panel" style={{ padding: 28, textAlign: "center", color: "var(--text-dim)" }}>
              {t("signals.no_signals")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {results.map((h, idx) => {
                const r = Math.abs(h.entry - h.stop_loss);
                const rr = r > 0 && h.take_profit[0] ? (Math.abs(h.take_profit[0] - h.entry) / r) : 0;
                return (
                  <div key={idx} className="panel" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 200, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12,
                          color: h.signal === "long" ? "var(--green)" : "var(--red)",
                        }}>{h.signal.toUpperCase()}</span>
                        {scope === "multi" && <span className="mono" style={{ fontSize: 12, color: "var(--text)" }}>{dsym(h.symbol)}</span>}
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</span>
                        <span className={`tag tag-${h.category}`} style={{ fontSize: 9 }}>{t(`cat.${h.category}`) || CATEGORY_LABELS[h.category as keyof typeof CATEGORY_LABELS]}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{h.reason}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", minWidth: 130 }}>
                      <div>{t("strat.entry")}: {h.entry.toFixed(4)}</div>
                      <div>SL: {h.stop_loss.toFixed(4)} · R:R {rr ? rr.toFixed(1) : "-"}</div>
                      <div style={{ color: "var(--accent)" }}>{t("signals.conf")}: {(h.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <Link href={`/demo?strategy=${h.stratId}&symbol=${h.symbol}`} className="btn btn-primary" style={{ whiteSpace: "nowrap", fontSize: 12, padding: "8px 14px" }}>
                      {t("signals.run_demo")} →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* All Time: zaman dilimi sekmeleri + seçili sekmenin sinyalleri */}
      {multiResults && (() => {
        const hits = multiResults[activeTab] || [];
        const longs = hits.filter((h) => h.signal === "long").length;
        const shorts = hits.filter((h) => h.signal === "short").length;
        return (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {INTERVALS.map((iv) => {
                const n = (multiResults[iv] || []).length;
                const act = activeTab === iv;
                return (
                  <button key={iv} onClick={() => setActiveTab(iv)} className="mono" style={{
                    padding: "7px 14px", borderRadius: 5, fontSize: 12, cursor: "pointer",
                    background: act ? "var(--green)" : "var(--bg-soft)",
                    color: act ? "#04150d" : "var(--text-dim)",
                    border: "1px solid " + (act ? "transparent" : "var(--border-glow)"),
                    fontWeight: act ? 700 : 400,
                  }}>{iv} <span style={{ opacity: 0.7 }}>({n})</span></button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <span className="display" style={{ fontSize: 15 }}>{hits.length} {t("signals.found")}</span>
              {hits.length > 0 && (
                <span className="mono" style={{ fontSize: 12 }}>
                  <span style={{ color: "var(--green)" }}>{longs} LONG</span> · <span style={{ color: "var(--red)" }}>{shorts} SHORT</span>
                </span>
              )}
            </div>

            {hits.length === 0 ? (
              <div className="panel" style={{ padding: 28, textAlign: "center", color: "var(--text-dim)" }}>{t("signals.no_signals")}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {hits.map((h, idx) => {
                  const r = Math.abs(h.entry - h.stop_loss);
                  const rr = r > 0 && h.take_profit[0] ? (Math.abs(h.take_profit[0] - h.entry) / r) : 0;
                  return (
                    <div key={idx} className="panel" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 200, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: h.signal === "long" ? "var(--green)" : "var(--red)" }}>{h.signal.toUpperCase()}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</span>
                          <span className={`tag tag-${h.category}`} style={{ fontSize: 9 }}>{t(`cat.${h.category}`) || CATEGORY_LABELS[h.category as keyof typeof CATEGORY_LABELS]}</span>
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{h.reason}</div>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", minWidth: 130 }}>
                        <div>{t("strat.entry")}: {h.entry.toFixed(4)}</div>
                        <div>SL: {h.stop_loss.toFixed(4)} · R:R {rr ? rr.toFixed(1) : "-"}</div>
                        <div style={{ color: "var(--accent)" }}>{t("signals.conf")}: {(h.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <Link href={`/demo?strategy=${h.stratId}&symbol=${h.symbol}`} className="btn btn-primary" style={{ whiteSpace: "nowrap", fontSize: 12, padding: "8px 14px" }}>
                        {t("signals.run_demo")} →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}

      {!results && !multiResults && !scanning && (
        <div className="panel" style={{ padding: 28, textAlign: "center", color: "var(--text-dim)", fontSize: 14 }}>
          {t("signals.hint")}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 5, whiteSpace: "pre" }}>{label}</div>
      {children}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  width: "100%", padding: "9px 10px", background: "var(--bg-soft)", color: "var(--text)",
  border: "1px solid var(--border-glow)", borderRadius: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
};

export default function SignalsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: 40 }}>…</div>}>
      <SignalsInner />
    </Suspense>
  );
}
