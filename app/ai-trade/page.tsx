"use client";
// AI Trade — komut tabanlı chat terminali (LLM yok, deterministik komut motoru).
// Komutlar: "<coin> signals", "<coin> etf", "<coin> long/short <usd> <lev>x", "positions", "balance", "help".
// Demo Trade ile AYNI cüzdanı kullanır (lib/wallet) — burada açılan pozisyon demo sayfasında görünür.
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { STRATEGIES } from "@/lib/registry";
import * as W from "@/lib/wallet";
import type { Candle } from "@/lib/indicators";
import { atr } from "@/lib/indicators";

interface Msg { role: "user" | "bot"; text: string; time: number; suggestions?: { label: string; cmd: string }[] }

// ETF verisi olan asset'ler (SoSoValue US + HK spot ETF'leri)
const ETF_ASSETS = new Set(["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "HYPE", "LINK", "LTC", "AVAX", "HBAR", "DOT"]);
const MSGS_KEY = "aiTradeMsgs";
const fmt$ = (n: number) => `$${Math.abs(n) >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2)}`;

async function fetchCandles(coin: string, interval: string = "1d"): Promise<Candle[] | null> {
  try {
    const r = await fetch(`/api/klines?symbol=SODEX:${coin}-USD&interval=${interval}&limit=300`, { cache: "no-store" });
    const j: any = await r.json();
    const rows: any[] = j?.candles || j?.data || (Array.isArray(j) ? j : []);
    if (!Array.isArray(rows) || rows.length < 60) return null;
    const c: Candle[] = rows
      .map((d: any) => Array.isArray(d)
        ? { time: Number(d[0]), open: Number(d[1]), high: Number(d[2]), low: Number(d[3]), close: Number(d[4]), volume: Number(d[5]) || 0 }
        : { time: Number(d.time ?? d.t), open: Number(d.open ?? d.o), high: Number(d.high ?? d.h), low: Number(d.low ?? d.l), close: Number(d.close ?? d.c), volume: Number(d.volume ?? d.v) || 0 })
      .filter((x) => isFinite(x.close) && x.close > 0);
    return c.length >= 60 ? c : null;
  } catch { return null; }
}

async function fetchPrice(coin: string): Promise<number | null> {
  try {
    const r = await fetch(`/api/klines?symbol=SODEX:${coin}-USD&interval=1m&limit=2`, { cache: "no-store" });
    const j: any = await r.json();
    const rows: any[] = j?.candles || j?.data || (Array.isArray(j) ? j : []);
    const last = rows[rows.length - 1];
    const p = Array.isArray(last) ? Number(last[4]) : Number(last?.close ?? last?.c);
    return isFinite(p) && p > 0 ? p : null;
  } catch { return null; }
}

export default function AiTradePage() {
  const { t } = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [symbols, setSymbols] = useState<Set<string>>(new Set(["BTC", "ETH", "SOL"]));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // sohbeti sessionStorage'dan yükle (sekme kapanana kadar korunur), yoksa karşılama
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(MSGS_KEY);
      if (saved) { const arr = JSON.parse(saved); if (Array.isArray(arr) && arr.length) { setMsgs(arr); return; } }
    } catch { /* ignore */ }
    setMsgs([{ role: "bot", time: Date.now(), text: t("ai.welcome") }]);
    // eslint-disable-next-line
  }, []);

  // her mesaj değişiminde kaydet
  useEffect(() => {
    if (msgs.length) { try { sessionStorage.setItem(MSGS_KEY, JSON.stringify(msgs.slice(-100))); } catch { /* ignore */ } }
  }, [msgs]);

  // sitedeki tüm aktif marketleri (81+) çek
  useEffect(() => {
    fetch("/api/sodex-markets", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const bases: string[] = (j?.markets || []).map((m: any) => String(m.base || "").toUpperCase()).filter(Boolean);
        if (bases.length) setSymbols(new Set(bases));
      })
      .catch(() => { /* varsayılan set kalır */ });
  }, []);

  const push = (role: "user" | "bot", text: string, suggestions?: { label: string; cmd: string }[]) =>
    setMsgs((m) => [...m, { role, text, time: Date.now(), suggestions }]);

  async function runSignals(coin: string, interval: string = "1d") {
    push("bot", t("ai.scanning").replace("{C}", interval === "1d" ? coin : `${coin} ${interval}`));
    const candles = await fetchCandles(coin, interval);
    if (!candles) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
    const firing: { name: string; cat: string; signal: string; conf: number; reason: string }[] = [];
    STRATEGIES.filter((s) => s.category !== "memecoin" && s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") firing.push({ name: s.name, cat: s.category, signal: sig.signal, conf: sig.confidence ?? 0, reason: sig.reason ?? "" });
      } catch { /* skip */ }
    });
    const longs = firing.filter((f) => f.signal === "long");
    const shorts = firing.filter((f) => f.signal === "short");
    const top = [...firing].sort((a, b) => b.conf - a.conf).slice(0, 5);
    const lines = [
      t("ai.sig_head").replace("{C}", interval === "1d" ? coin : `${coin} (${interval})`).replace("{P}", candles[candles.length - 1].close.toFixed(2)),
      ``,
      `🟢 LONG: ${longs.length}   🔴 SHORT: ${shorts.length}   (${firing.length}/${STRATEGIES.filter((s) => s.category !== "memecoin" && s.run).length})`,
      ``,
      t("ai.sig_top"),
      ...top.map((f) => `${f.signal === "long" ? "🟢" : "🔴"} ${f.name} (${f.conf}) — ${f.reason}`),
    ];
    // sinyal dengesine göre öneri: baskın yön önce
    const longFirst = longs.length >= shorts.length;
    const sugg = longFirst
      ? [
          { label: `🟢 ${coin} Long $100 5x`, cmd: `${coin.toLowerCase()} long 100 5x` },
          { label: `🔴 ${coin} Short $100 5x`, cmd: `${coin.toLowerCase()} short 100 5x` },
          { label: `🛠 Setup ${coin}`, cmd: `setup ${coin.toLowerCase()}` },
        ]
      : [
          { label: `🔴 ${coin} Short $100 5x`, cmd: `${coin.toLowerCase()} short 100 5x` },
          { label: `🟢 ${coin} Long $100 5x`, cmd: `${coin.toLowerCase()} long 100 5x` },
          { label: `🛠 Setup ${coin}`, cmd: `setup ${coin.toLowerCase()}` },
        ];
    push("bot", lines.join("\n"), sugg);
  }

  // "market" komutu: skills-signal motoru + ETF akışından tek mesajlık piyasa özeti
  // Tek coin için sinyal skoru (hunt için): net conviction = Σ(long conf) - Σ(short conf)
  function scoreCoin(candles: Candle[]) {
    let longs = 0, shorts = 0, net = 0, best: { name: string; signal: string; conf: number } | null = null;
    STRATEGIES.filter((s) => s.category !== "memecoin" && s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") {
          const c = sig.confidence ?? 0;
          if (sig.signal === "long") { longs++; net += c; } else { shorts++; net -= c; }
          if (!best || c > best.conf) best = { name: s.name, signal: sig.signal, conf: c };
        }
      } catch { /* skip */ }
    });
    return { longs, shorts, net, best };
  }

  // "hunt": en hareketli marketleri strateji motorundan geçirip en güçlü long/short fırsatlarını bulur
  async function runHunt(dir?: "long" | "short") {
    push("bot", t("ai.hunt_start"));
    // hedef liste: majörler + 24s en hareketliler (tickers'tan), sitede listeli olanlar
    let targets: string[] = ["BTC", "ETH", "SOL"];
    try {
      const r = await fetch("/api/market-tickers", { cache: "no-store" });
      const j: any = await r.json();
      const rows: any[] = j?.rows || [];
      const movers = rows
        .filter((x) => x.base && symbols.has(String(x.base).toUpperCase()) && isFinite(x.change))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 9)
        .map((x) => String(x.base).toUpperCase());
      targets = Array.from(new Set([...targets, ...movers])).slice(0, 10);
    } catch { /* majörlerle devam */ }

    const candleSets = await Promise.all(targets.map(async (c) => ({ coin: c, candles: await fetchCandles(c) })));
    const scored = candleSets
      .filter((x) => x.candles)
      .map((x) => {
        const s = scoreCoin(x.candles!);
        return { coin: x.coin, price: x.candles![x.candles!.length - 1].close, ...s };
      });
    if (!scored.length) { push("bot", t("ai.hunt_none")); return; }

    const longsRank = dir === "short" ? [] : [...scored].filter((s) => s.net > 0).sort((a, b) => b.net - a.net).slice(0, dir === "long" ? 5 : 3);
    const shortsRank = dir === "long" ? [] : [...scored].filter((s) => s.net < 0).sort((a, b) => a.net - b.net).slice(0, dir === "short" ? 5 : 3);
    const row = (s: typeof scored[number]) =>
      `${s.net > 0 ? "🟢" : "🔴"} ${s.coin} @ ${s.price >= 100 ? s.price.toFixed(0) : s.price.toFixed(3)} — ${s.longs}L/${s.shorts}S · ${t("ai.hunt_score")}: ${s.net > 0 ? "+" : ""}${Math.round(s.net)}${s.best ? ` · ${(s.best as any).name}` : ""}`;

    const lines = [
      t("ai.hunt_head").replace("{N}", String(scored.length)),
      ``,
      longsRank.length ? `🎯 ${t("ai.hunt_longs")}:` : "",
      ...longsRank.map(row),
      longsRank.length && shortsRank.length ? `` : "",
      shortsRank.length ? `🎯 ${t("ai.hunt_shorts")}:` : "",
      ...shortsRank.map(row),
      !longsRank.length && !shortsRank.length ? t("ai.hunt_flat") : "",
    ].filter((x) => x !== "");

    const sugg: { label: string; cmd: string }[] = [];
    if (longsRank[0]) sugg.push({ label: `🟢 ${longsRank[0].coin} Long $100 5x`, cmd: `${longsRank[0].coin.toLowerCase()} long 100 5x` });
    if (shortsRank[0]) sugg.push({ label: `🔴 ${shortsRank[0].coin} Short $100 5x`, cmd: `${shortsRank[0].coin.toLowerCase()} short 100 5x` });
    if (longsRank[0]) sugg.push({ label: `📡 ${longsRank[0].coin} ${t("ai.hunt_detail")}`, cmd: longsRank[0].coin.toLowerCase() });
    push("bot", lines.join("\n"), sugg.length ? sugg : undefined);
  }

  // "movers": 24s en çok yükselen/düşenler
  async function runMovers() {
    push("bot", t("ai.mv_fetch"));
    try {
      const r = await fetch("/api/market-tickers", { cache: "no-store" });
      const j: any = await r.json();
      const rows: any[] = (j?.rows || []).filter((x: any) => x.base && isFinite(x.change) && x.price > 0);
      if (!rows.length) { push("bot", t("ai.mv_none")); return; }
      const up = [...rows].sort((a, b) => b.change - a.change).slice(0, 5);
      const dn = [...rows].sort((a, b) => a.change - b.change).slice(0, 5);
      const fmtRow = (x: any) => `${x.change >= 0 ? "🟢" : "🔴"} ${x.base}  ${x.change >= 0 ? "+" : ""}${x.change.toFixed(1)}%  @ ${x.price >= 100 ? x.price.toFixed(0) : x.price.toFixed(3)}`;
      const lines = [t("ai.mv_head"), ``, `📈 ${t("ai.mv_up")}:`, ...up.map(fmtRow), ``, `📉 ${t("ai.mv_down")}:`, ...dn.map(fmtRow)];
      const sugg = up[0] && symbols.has(String(up[0].base).toUpperCase())
        ? [{ label: `📡 ${up[0].base} ${t("ai.hunt_detail")}`, cmd: String(up[0].base).toLowerCase() }]
        : undefined;
      push("bot", lines.join("\n"), sugg);
    } catch { push("bot", t("ai.mv_none")); }
  }

  // "news": SoSoValue haber akışı + sentiment
  async function runNews() {
    push("bot", t("ai.news_fetch"));
    try {
      const r = await fetch("/api/news?page=1", { cache: "no-store" });
      const j: any = await r.json();
      const items: any[] = (j?.items || []).slice(0, 6);
      if (!items.length) { push("bot", t("ai.news_none")); return; }
      let bull = 0, bear = 0;
      const lines = items.map((n) => {
        const ic = n.sentiment === "bullish" ? "🟢" : n.sentiment === "bearish" ? "🔴" : "⚪";
        if (n.sentiment === "bullish") bull++; if (n.sentiment === "bearish") bear++;
        const cur = Array.isArray(n.currencies) && n.currencies.length ? ` [${n.currencies.slice(0, 3).join(",")}]` : "";
        return `${ic} ${String(n.title).slice(0, 110)}${cur}`;
      });
      const tone = bull > bear ? t("ai.news_bull") : bear > bull ? t("ai.news_bear") : t("ai.news_mixed");
      push("bot", [t("ai.news_head"), ``, ...lines, ``, `${t("ai.news_tone")}: ${tone} (🟢${bull} / 🔴${bear})`].join("\n"));
    } catch { push("bot", t("ai.news_none")); }
  }

  // "fg": Korku & Açgözlülük — şimdi + 7 gün trend (alternative.me public API)
  async function runFg() {
    push("bot", t("ai.fg_fetch"));
    try {
      const r = await fetch("https://api.alternative.me/fng/?limit=8", { cache: "no-store" });
      const j: any = await r.json();
      const arr: any[] = j?.data || [];
      if (!arr.length) { push("bot", t("ai.fg_none")); return; }
      const now = Number(arr[0].value);
      const weekAgo = arr[7] ? Number(arr[7].value) : null;
      const cls = String(arr[0].value_classification || "");
      const trend = weekAgo != null ? now - weekAgo : null;
      const bar = "█".repeat(Math.round(now / 10)) + "░".repeat(10 - Math.round(now / 10));
      const lines = [
        `😨 ${t("ai.mkt_fg")}: ${now}/100 — ${cls}`,
        bar,
        trend != null ? `${t("ai.fg_week")}: ${trend >= 0 ? "🟢 +" : "🔴 "}${trend} (${weekAgo} → ${now})` : "",
        ``,
        now <= 25 ? t("ai.mkt_fg_extfear") : now <= 45 ? t("ai.mkt_fg_fear") : now < 55 ? t("ai.mkt_fg_neutral") : now < 75 ? t("ai.mkt_fg_greed") : t("ai.mkt_fg_extgreed"),
      ].filter(Boolean);
      push("bot", lines.join("\n"));
    } catch { push("bot", t("ai.fg_none")); }
  }

  // "confluence <coin>": kategori bazlı uzlaşma — hangi mantık aileleri hangi yönde
  async function runConfluence(coin: string) {
    push("bot", t("ai.cf_fetch").replace("{C}", coin));
    const candles = await fetchCandles(coin);
    if (!candles) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
    const byCat: Record<string, { l: number; s: number }> = {};
    STRATEGIES.filter((s) => s.category !== "memecoin" && s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") {
          const c = (byCat[s.category] ||= { l: 0, s: 0 });
          if (sig.signal === "long") c.l++; else c.s++;
        }
      } catch { /* skip */ }
    });
    const cats = Object.entries(byCat)
      .map(([cat, v]) => ({ cat, ...v, net: v.l - v.s }))
      .filter((x) => x.l + x.s > 0)
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    if (!cats.length) { push("bot", t("ai.cf_none").replace("{C}", coin)); return; }
    const agree = cats.filter((x) => x.net > 0).length;
    const disagree = cats.filter((x) => x.net < 0).length;
    const lines = [
      t("ai.cf_head").replace("{C}", coin),
      ``,
      ...cats.slice(0, 12).map((x) => `${x.net > 0 ? "🟢" : x.net < 0 ? "🔴" : "⚪"} ${x.cat}: ${x.l}L/${x.s}S`),
      ``,
      `${t("ai.cf_sum")}: 🟢 ${agree} ${t("ai.cf_families")} long · 🔴 ${disagree} short`,
    ];
    push("bot", lines.join("\n"));
  }

  // "compare <a> <b>": iki coin yan yana
  async function runCompare(a: string, b: string) {
    push("bot", t("ai.cmp_fetch").replace("{A}", a).replace("{B}", b));
    const [ca, cb] = await Promise.all([fetchCandles(a), fetchCandles(b)]);
    if (!ca || !cb) { push("bot", t("ai.no_price").replace("{C}", !ca ? a : b)); return; }
    const sa = scoreCoin(ca), sb = scoreCoin(cb);
    const rowFor = (coin: string, s: ReturnType<typeof scoreCoin>, candles: Candle[]) =>
      `${s.net >= 0 ? "🟢" : "🔴"} ${coin} @ ${candles[candles.length - 1].close.toFixed(2)} — ${s.longs}L/${s.shorts}S · ${t("ai.hunt_score")}: ${s.net >= 0 ? "+" : ""}${Math.round(s.net)}`;
    const winner = sa.net === sb.net ? null : sa.net > sb.net ? a : b;
    const lines = [
      t("ai.cmp_head").replace("{A}", a).replace("{B}", b),
      ``,
      rowFor(a, sa, ca),
      rowFor(b, sb, cb),
      ``,
      winner ? t("ai.cmp_winner").replace("{C}", winner) : t("ai.cmp_tie"),
    ];
    const sugg = winner ? [{ label: `📡 ${winner} ${t("ai.hunt_detail")}`, cmd: winner.toLowerCase() }] : undefined;
    push("bot", lines.join("\n"), sugg);
  }

  // "pnl": portföy özeti — açık + gerçekleşen
  async function runPnl() {
    const w = W.loadWallet();
    const realized = w.history.reduce((a, tr) => a + (tr.pnl || 0), 0);
    let unrealized = 0;
    const posLines: string[] = [];
    if (w.positions.length) {
      const rows = await Promise.all(w.positions.map(async (p) => {
        const coin = p.symbol.replace("SODEX:", "").replace("-USD", "");
        const price = await fetchPrice(coin);
        const pnl = price ? W.calcPnl(p, price) : 0;
        return { coin, side: p.side, pnl };
      }));
      rows.forEach((r) => { unrealized += r.pnl; });
      const best = [...rows].sort((a, b) => b.pnl - a.pnl)[0];
      const worst = [...rows].sort((a, b) => a.pnl - b.pnl)[0];
      if (best) posLines.push(`🏆 ${t("ai.pnl_best")}: ${best.coin} ${best.side} ${best.pnl >= 0 ? "+" : ""}${fmt$(best.pnl)}`);
      if (worst && worst !== best) posLines.push(`🩸 ${t("ai.pnl_worst")}: ${worst.coin} ${worst.side} ${worst.pnl >= 0 ? "+" : ""}${fmt$(worst.pnl)}`);
    }
    const START = 10000;
    const equity = w.balance + unrealized + w.positions.reduce((a, p) => a + p.margin, 0);
    const totalRet = ((equity / (START * (1 + (w.topups || 0)))) - 1) * 100;
    const lines = [
      t("ai.pnl_head"),
      ``,
      `💰 ${t("ai.pnl_equity")}: ${fmt$(equity)}  (${totalRet >= 0 ? "+" : ""}${totalRet.toFixed(1)}%)`,
      `📈 ${t("ai.pnl_unreal")}: ${unrealized >= 0 ? "🟢 +" : "🔴 "}${fmt$(unrealized)}  (${w.positions.length} ${t("ai.pnl_open")})`,
      `✅ ${t("ai.pnl_real")}: ${realized >= 0 ? "🟢 +" : "🔴 "}${fmt$(realized)}  (${w.history.length} ${t("ai.pnl_closed")})`,
      ...posLines,
    ];
    push("bot", lines.join("\n"));
  }

  // "ssi": SoSoValue index sinyalleri (MAG7/DEFI/MEME) — fiyat + 24s + yön
  async function runSsi() {
    push("bot", t("ai.ssi_fetch"));
    try {
      const r = await fetch("/api/market-tickers", { cache: "no-store" });
      const j: any = await r.json();
      const rows: any[] = (j?.rows || []).filter((x: any) => x.category === "ssi");
      if (!rows.length) { push("bot", t("ai.ssi_none")); return; }
      const lines = [
        t("ai.ssi_head"),
        ``,
        ...rows.map((x: any) => {
          const bias = x.change >= 2 ? "🟢 Bullish" : x.change >= 0.5 ? "🟢 " + t("ai.ssi_lean") : x.change <= -2 ? "🔴 Bearish" : x.change <= -0.5 ? "🔴 " + t("ai.ssi_lean") : "⚪ Neutral";
          return `${x.display?.replace(/^v|_vUSDC$/g, "") || x.base}: ${x.change >= 0 ? "+" : ""}${Number(x.change).toFixed(2)}% — ${bias}`;
        }),
      ];
      push("bot", lines.join("\n"));
    } catch { push("bot", t("ai.ssi_none")); }
  }

  // "funding <coin>": Binance funding rate — kalabalık hangi yönde
  async function runFunding(coin: string) {
    push("bot", t("ai.fund_fetch").replace("{C}", coin));
    try {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${coin}USDT`, { cache: "no-store" });
      const j: any = await r.json();
      const rate = Number(j?.lastFundingRate);
      if (!isFinite(rate)) { push("bot", t("ai.fund_none").replace("{C}", coin)); return; }
      const pct = rate * 100;
      const annual = pct * 3 * 365;
      const read = pct > 0.05 ? t("ai.fund_hot_long") : pct > 0.01 ? t("ai.fund_lean_long") : pct < -0.05 ? t("ai.fund_hot_short") : pct < -0.01 ? t("ai.fund_lean_short") : t("ai.fund_neutral");
      const lines = [
        `⚖️ ${coin} funding (Binance perp)`,
        ``,
        `${pct >= 0 ? "🟢" : "🔴"} ${t("ai.fund_rate")}: ${pct >= 0 ? "+" : ""}${pct.toFixed(4)}% / 8h  (~${annual >= 0 ? "+" : ""}${annual.toFixed(0)}% ${t("ai.fund_yr")})`,
        ``,
        read,
      ];
      push("bot", lines.join("\n"));
    } catch { push("bot", t("ai.fund_none").replace("{C}", coin)); }
  }

  // "why <coin>": çok kaynaklı muhakeme — sinyal + aile uzlaşması + funding + F&G + ETF tek okumada
  async function runWhy(coin: string) {
    push("bot", t("ai.why_fetch").replace("{C}", coin));
    const candles = await fetchCandles(coin);
    if (!candles) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }

    // 1) strateji taraması + aile uzlaşması
    const byCat: Record<string, { l: number; s: number }> = {};
    let longs = 0, shorts = 0;
    STRATEGIES.filter((s) => s.category !== "memecoin" && s.run).forEach((s) => {
      try {
        const sig = s.run!(candles);
        if (sig && sig.signal !== "neutral") {
          const c = (byCat[s.category] ||= { l: 0, s: 0 });
          if (sig.signal === "long") { c.l++; longs++; } else { c.s++; shorts++; }
        }
      } catch { /* skip */ }
    });
    const famLong = Object.values(byCat).filter((v) => v.l > v.s).length;
    const famShort = Object.values(byCat).filter((v) => v.s > v.l).length;
    const dir: "long" | "short" | "flat" = longs > shorts * 1.3 ? "long" : shorts > longs * 1.3 ? "short" : "flat";

    const bullets: string[] = [];
    bullets.push(`${dir === "long" ? "🟢" : dir === "short" ? "🔴" : "⚪"} ${t("ai.why_strats").replace("{L}", String(longs)).replace("{S}", String(shorts))}`);
    bullets.push(`${famLong >= famShort ? "🟢" : "🔴"} ${t("ai.why_families").replace("{FL}", String(famLong)).replace("{FS}", String(famShort))}`);

    // 2) funding (varsa) — kalabalık okuma
    try {
      const r = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${coin}USDT`, { cache: "no-store" });
      const j: any = await r.json();
      const pct = Number(j?.lastFundingRate) * 100;
      if (isFinite(pct)) {
        if (pct > 0.03) bullets.push(`🔴 ${t("ai.why_fund_long")}`);
        else if (pct < -0.03) bullets.push(`🟢 ${t("ai.why_fund_short")}`);
        else bullets.push(`⚪ ${t("ai.why_fund_flat")}`);
      }
    } catch { /* funding yoksa geç */ }

    // 3) F&G — kontrarian bağlam
    try {
      const r = await fetch("https://api.alternative.me/fng/?limit=1", { cache: "no-store" });
      const j: any = await r.json();
      const fg = Number(j?.data?.[0]?.value);
      if (isFinite(fg)) {
        if (fg <= 30) bullets.push(`🟢 ${t("ai.why_fg_fear").replace("{V}", String(fg))}`);
        else if (fg >= 70) bullets.push(`🔴 ${t("ai.why_fg_greed").replace("{V}", String(fg))}`);
        else bullets.push(`⚪ ${t("ai.why_fg_mid").replace("{V}", String(fg))}`);
      }
    } catch { /* geç */ }

    // 4) ETF akışı (ETF'li asset ise)
    if (ETF_ASSETS.has(coin)) {
      try {
        const r = await fetch(`/api/etf?asset=${coin.toLowerCase()}`, { cache: "no-store" });
        const j: any = await r.json();
        const h = j?.history;
        if (Array.isArray(h) && h.length) {
          const wk = h.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0);
          bullets.push(`${wk >= 0 ? "🟢" : "🔴"} ${t(wk >= 0 ? "ai.why_etf_in" : "ai.why_etf_out").replace("{V}", fmt$(Math.abs(wk)))}`);
        }
      } catch { /* geç */ }
    }

    const verdict = dir === "long" ? t("ai.why_verdict_long").replace("{C}", coin)
      : dir === "short" ? t("ai.why_verdict_short").replace("{C}", coin)
      : t("ai.why_verdict_flat").replace("{C}", coin);
    const sugg = dir !== "flat"
      ? [{ label: `${dir === "long" ? "🟢" : "🔴"} ${coin} ${dir === "long" ? "Long" : "Short"} $100 5x`, cmd: `${coin.toLowerCase()} ${dir} 100 5x` }, { label: `🛠 Setup ${coin}`, cmd: `setup ${coin.toLowerCase()}` }]
      : [{ label: `🛠 Setup ${coin}`, cmd: `setup ${coin.toLowerCase()}` }];

    push("bot", [t("ai.why_head").replace("{C}", coin), ``, ...bullets, ``, `🧭 ${verdict}`].join("\n"), sugg);
  }

  // "setup <coin>": ATR bazlı hazır işlem planı — yön + volatiliteye göre SL/TP
  async function runSetup(coin: string) {
    push("bot", t("ai.setup_fetch").replace("{C}", coin));
    const candles = await fetchCandles(coin);
    if (!candles) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
    const s = scoreCoin(candles);
    const price = candles[candles.length - 1].close;
    const atrArr = atr(candles, 14);
    const lastAtr = atrArr[atrArr.length - 1];
    if (!isFinite(lastAtr) || lastAtr <= 0) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
    const atrPct = (lastAtr / price) * 100;
    const dir: "long" | "short" | null = s.net > 0 ? "long" : s.net < 0 ? "short" : null;
    if (!dir) { push("bot", t("ai.setup_flat").replace("{C}", coin)); return; }

    // SL = 1.5 ATR, TP = 3 ATR (1:2 risk/ödül), volatiliteye göre önerilen kaldıraç
    const slPct = Math.round(atrPct * 1.5 * 10) / 10;
    const tpPct = Math.round(atrPct * 3 * 10) / 10;
    const mul = dir === "long" ? 1 : -1;
    const slPrice = price * (1 - mul * slPct / 100);
    const tpPrice = price * (1 + mul * tpPct / 100);
    const lev = atrPct > 5 ? 2 : atrPct > 3 ? 3 : atrPct > 1.5 ? 5 : 10;

    const lines = [
      t("ai.setup_head").replace("{C}", coin),
      ``,
      `${dir === "long" ? "🟢 LONG" : "🔴 SHORT"} @ ${price >= 100 ? price.toFixed(2) : price.toFixed(4)}  (${s.longs}L/${s.shorts}S, ${t("ai.hunt_score")}: ${s.net > 0 ? "+" : ""}${Math.round(s.net)})`,
      ``,
      `📏 ATR(14): ${atrPct.toFixed(1)}% ${t("ai.setup_vol")}`,
      `🛑 SL: ${slPrice >= 100 ? slPrice.toFixed(2) : slPrice.toFixed(4)}  (${slPct}% = 1.5×ATR)`,
      `🎯 TP: ${tpPrice >= 100 ? tpPrice.toFixed(2) : tpPrice.toFixed(4)}  (${tpPct}% = 3×ATR, 1:2 R/R)`,
      `⚖️ ${t("ai.setup_lev")}: ${lev}x`,
      ``,
      t("ai.setup_note"),
    ];
    const cmd = `${coin.toLowerCase()} ${dir} 100 ${lev}x sl ${slPct} tp ${tpPct}`;
    push("bot", lines.join("\n"), [{ label: `⚡ ${t("ai.setup_open")} ($100)`, cmd }]);
  }

  // "risk": portföy risk kontrolü — maruziyet, yön yoğunlaşması, coin yoğunlaşması
  async function runRisk() {
    const w = W.loadWallet();
    if (!w.positions.length) { push("bot", t("ai.risk_none")); return; }
    const rows = await Promise.all(w.positions.map(async (p) => {
      const coin = p.symbol.replace("SODEX:", "").replace("-USD", "");
      const price = await fetchPrice(coin);
      return { coin, side: p.side, size: p.size, margin: p.margin, pnl: price ? W.calcPnl(p, price) : 0 };
    }));
    const totalNotional = rows.reduce((a, r) => a + r.size, 0);
    const totalMargin = rows.reduce((a, r) => a + r.margin, 0);
    const unreal = rows.reduce((a, r) => a + r.pnl, 0);
    const equity = w.balance + totalMargin + unreal;
    const expRatio = equity > 0 ? totalNotional / equity : 0;
    const longNot = rows.filter((r) => r.side === "long").reduce((a, r) => a + r.size, 0);
    const shortNot = totalNotional - longNot;
    const dirPct = totalNotional > 0 ? Math.round((Math.max(longNot, shortNot) / totalNotional) * 100) : 0;
    const dirSide = longNot >= shortNot ? "LONG" : "SHORT";
    const byCoin: Record<string, number> = {};
    rows.forEach((r) => { byCoin[r.coin] = (byCoin[r.coin] || 0) + r.size; });
    const [topCoin, topNot] = Object.entries(byCoin).sort((a, b) => b[1] - a[1])[0];
    const concPct = totalNotional > 0 ? Math.round((topNot / totalNotional) * 100) : 0;

    const warns: string[] = [];
    if (expRatio >= 3) warns.push(`🔥 ${t("ai.risk_warn_exp").replace("{R}", expRatio.toFixed(1))}`);
    if (dirPct >= 90 && rows.length >= 2) warns.push(`⚠️ ${t("ai.risk_warn_dir").replace("{P}", String(dirPct)).replace("{D}", dirSide)}`);
    if (concPct >= 60 && rows.length >= 2) warns.push(`⚠️ ${t("ai.risk_warn_conc").replace("{C}", topCoin).replace("{P}", String(concPct))}`);

    const lines = [
      t("ai.risk_head"),
      ``,
      `📐 ${t("ai.risk_exposure")}: ${fmt$(totalNotional)} / ${fmt$(equity)}  (${expRatio.toFixed(1)}x)`,
      `🧭 ${t("ai.risk_dir")}: ${dirPct}% ${dirSide}  (🟢 ${fmt$(longNot)} / 🔴 ${fmt$(shortNot)})`,
      `🎯 ${t("ai.risk_conc")}: ${topCoin} ${concPct}%`,
      ``,
      ...(warns.length ? warns : [`✅ ${t("ai.risk_ok")}`]),
    ];
    push("bot", lines.join("\n"));
  }

  // "closeall": tüm pozisyonları canlı fiyattan kapat
  async function runCloseAll() {
    const w = W.loadWallet();
    if (!w.positions.length) { push("bot", t("ai.closeall_none")); return; }
    let cur = w, totalPnl = 0, closed = 0;
    for (const p of [...w.positions]) {
      const coin = p.symbol.replace("SODEX:", "").replace("-USD", "");
      const price = await fetchPrice(coin);
      if (!price) continue;
      totalPnl += W.calcPnl(p, price);
      cur = W.closePosition(cur, p.id, price, "AI Trade chat: closeall");
      closed++;
    }
    if (!closed) { push("bot", t("ai.closeall_none")); return; }
    push("bot", t("ai.closeall_done")
      .replace("{N}", String(closed))
      .replace("{PNL}", `${totalPnl >= 0 ? "+" : ""}${fmt$(totalPnl)}`)
      .replace("{B}", fmt$(W.loadWallet().balance)));
  }

  async function runMarket() {
    push("bot", t("ai.mkt_fetch"));
    try {
      const r = await fetch("/api/skills-signal", { cache: "no-store" });
      const j: any = await r.json();
      if (!j || j.error || !j.decision) { push("bot", t("ai.mkt_none")); return; }
      const m = j.decision.market;
      const fg = Math.round(m.fearGreed ?? 50);
      const alt = Math.round(m.altseasonIndex ?? 50);
      const dom = m.btcDominance != null ? Number(m.btcDominance).toFixed(1) : null;
      const b7 = m.signals?.btcReturn7d;
      const b30 = m.signals?.btcReturn30d;
      const breadth = j.breadth;
      const riskFlags: string[] = m.riskFlags || [];

      // F&G etiketi
      const fgLabel = fg <= 25 ? t("ai.mkt_fg_extfear") : fg <= 45 ? t("ai.mkt_fg_fear") : fg < 55 ? t("ai.mkt_fg_neutral") : fg < 75 ? t("ai.mkt_fg_greed") : t("ai.mkt_fg_extgreed");

      // ETF: BTC + ETH son gün ve 7 gün net akış
      let etfLine = "";
      try {
        const [bR, eR] = await Promise.all([
          fetch("/api/etf?asset=btc", { cache: "no-store" }).then((x) => x.json()).catch(() => null),
          fetch("/api/etf?asset=eth", { cache: "no-store" }).then((x) => x.json()).catch(() => null),
        ]);
        const part = (label: string, jj: any) => {
          const h = jj?.history;
          if (!Array.isArray(h) || !h.length) return null;
          const last = h[h.length - 1];
          const wk = h.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0);
          const dayIc = last.net >= 0 ? "🟢" : "🔴";
          const wkIc = wk >= 0 ? "🟢" : "🔴";
          return `${label}: ${dayIc} ${last.net >= 0 ? "+" : ""}${fmt$(last.net)} ${t("ai.mkt_day")} · ${wkIc} ${wk >= 0 ? "+" : ""}${fmt$(wk)} ${t("ai.mkt_week")}`;
        };
        const lines = [part("BTC ETF", bR), part("ETH ETF", eR)].filter(Boolean);
        if (lines.length) etfLine = lines.join("\n");
      } catch { /* etf yoksa özet yine çalışır */ }

      const out = [
        t("ai.mkt_head"),
        ``,
        `📊 ${t("ai.mkt_regime")}: ${m.regimeLabel || m.regime}${m.regimeConfidence ? ` (${Math.round(m.regimeConfidence)}%)` : ""}`,
        `😨 ${t("ai.mkt_fg")}: ${fg}/100 — ${fgLabel}`,
        dom ? `👑 BTC ${t("ai.mkt_dom")}: ${dom}%  ·  Altseason: ${alt}/100` : `Altseason: ${alt}/100`,
        (b7 != null && b30 != null) ? `📈 BTC: ${b7 >= 0 ? "+" : ""}${Number(b7).toFixed(1)}% 7d · ${b30 >= 0 ? "+" : ""}${Number(b30).toFixed(1)}% 30d` : "",
        breadth ? `🌐 ${t("ai.mkt_breadth")}: ${breadth.advancers24h}/${breadth.universe} ${t("ai.mkt_up24")}` : "",
        etfLine ? `` : "",
        etfLine,
        ``,
        riskFlags.length ? `⚠️ ${t("ai.mkt_risks")}: ${riskFlags.join(", ")}` : `✅ ${t("ai.mkt_norisk")}`,
        m.playbook?.directionBias ? `` : "",
        m.playbook?.directionBias ? `🧭 ${m.playbook.directionBias}` : "",
      ].filter((x) => x !== "");
      push("bot", out.join("\n"));
    } catch { push("bot", t("ai.mkt_none")); }
  }

  async function runEtf(coin: string) {
    push("bot", t("ai.etf_fetch").replace("{C}", coin));
    try {
      const r = await fetch(`/api/etf?asset=${coin.toLowerCase()}`, { cache: "no-store" });
      const j: any = await r.json();
      if (!j || j.error || !Array.isArray(j.history) || !j.history.length) { push("bot", t("ai.etf_none").replace("{C}", coin)); return; }
      const h = j.history;
      const last = h[h.length - 1];
      const wk = h.slice(-7).reduce((a: number, d: any) => a + (Number(d.net) || 0), 0);
      const lines = [
        t("ai.etf_head").replace("{C}", coin),
        ``,
        `${t("ai.etf_daily")} (${last.date}): ${last.net >= 0 ? "🟢 +" : "🔴 "}${fmt$(last.net)}`,
        `${t("ai.etf_week")}: ${wk >= 0 ? "🟢 +" : "🔴 "}${fmt$(wk)}`,
        `${t("ai.etf_cum")}: ${fmt$(last.cum)}`,
        last.assets ? `AUM: ${fmt$(last.assets)}` : "",
        j.funds?.length ? t("ai.etf_funds") + " " + j.funds.slice(0, 5).map((f: any) => f.ticker || f.name).filter(Boolean).join(", ") : "",
      ].filter(Boolean);
      push("bot", lines.join("\n"));
    } catch { push("bot", t("ai.etf_none").replace("{C}", coin)); }
  }

  async function handleCommand(raw: string) {
    const txt = raw.trim();
    if (!txt) return;
    push("user", txt);
    setBusy(true);
    try {
      const low = txt.toLowerCase();
      const up = txt.toUpperCase();

      // --- yeni komutlar (MCP motoruna bağlı) ---
      const callMcp = async (toolName: string, a: any) => {
        try {
          const r = await fetch("/api/mcp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: toolName, arguments: a } }) });
          const j = await r.json();
          return JSON.parse(j?.result?.content?.[0]?.text || "{}");
        } catch { return null; }
      };
      let nm: RegExpMatchArray | null;

      // vol <coin>
      if ((nm = low.match(/^(?:vol|volatility)\s+([a-z0-9]{2,8})$/))) {
        const d = await callMcp("get_volatility", { symbol: nm[1].toUpperCase() });
        if (!d || d.atrDailyPct == null) { push("bot", `Could not read volatility for ${nm[1].toUpperCase()}.`); return; }
        push("bot", [`📊 ${d.symbol} volatility`, ``, `ATR daily: ${d.atrDailyPct}% (${d.level})`, `vs recent: ${d.vsRecentAverage}`, `30d avg range: ${d.avg30dRangePct}%`].join("\n"));
        return;
      }
      // correlation <a> <b>
      if ((nm = low.match(/^(?:corr|correlation)\s+([a-z0-9]{2,8})\s+([a-z0-9]{2,8})$/))) {
        const d = await callMcp("get_correlation", { symbolA: nm[1].toUpperCase(), symbolB: nm[2].toUpperCase() });
        if (!d || d.correlation == null) { push("bot", `Could not compute correlation.`); return; }
        push("bot", [`🔗 ${d.symbolA} vs ${d.symbolB} correlation`, ``, `${d.correlation} (${d.window})`, d.read].join("\n"));
        return;
      }
      // top / leaderboard
      if (low === "top" || low === "leaderboard") {
        const d = await callMcp("get_leaderboard", {});
        if (!d || !d.topLong) { push("bot", `Could not build the leaderboard right now.`); return; }
        const row = (s: any) => `${s.netConviction > 0 ? "🟢" : "🔴"} ${s.coin} — ${s.long}L/${s.short}S · ${s.netConviction > 0 ? "+" : ""}${s.netConviction}`;
        push("bot", [`🏆 Leaderboard — ${d.scanned} markets`, ``, `Strongest LONG:`, ...d.topLong.map(row), ``, `Strongest SHORT:`, ...d.topShort.map(row)].join("\n"));
        return;
      }
      // explain <strategy>
      if ((nm = low.match(/^explain\s+(.+)$/))) {
        const d = await callMcp("explain_strategy", { strategy: nm[1].trim() });
        if (!d || !d.name) { push("bot", d?.text || `No strategy found matching "${nm[1].trim()}".`); return; }
        push("bot", [`📖 ${d.name} (${d.category})`, ``, d.description, ``, `Entry: ${d.entry}`, `Exit: ${d.exit}`].join("\n"));
        return;
      }
      // history <coin>
      if ((nm = low.match(/^(?:history|hist)\s+([a-z0-9]{2,8})$/))) {
        const d = await callMcp("get_price_history", { symbol: nm[1].toUpperCase(), days: 7 });
        if (!d || d.close == null) { push("bot", `Could not fetch history for ${nm[1].toUpperCase()}.`); return; }
        push("bot", [`📅 ${d.symbol} — last ${d.days}d`, ``, `Open ${d.open} → Close ${d.close}`, `Change: ${d.changePct >= 0 ? "+" : ""}${d.changePct}% (${d.trend})`, `High ${d.high} · Low ${d.low}`].join("\n"));
        return;
      }

      // --- trade komutu: "btc long 100 5x" / "eth short 50$ 10x" ---
      const tradeM = low.match(/^([a-z0-9]{2,8})\s+(long|short)\s+\$?(\d+(?:\.\d+)?)\$?\s*(?:(\d+)\s*x)?(?:\s+sl\s*(\d+(?:\.\d+)?)%?)?(?:\s+tp\s*(\d+(?:\.\d+)?)%?)?$/);
      if (tradeM) {
        const coin = tradeM[1].toUpperCase();
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        const side = tradeM[2] as "long" | "short";
        const usd = parseFloat(tradeM[3]);
        const lev = Math.max(1, Math.min(25, parseInt(tradeM[4] || "1")));
        const slPct = tradeM[5] ? parseFloat(tradeM[5]) : null;
        const tpPct = tradeM[6] ? parseFloat(tradeM[6]) : null;
        const price = await fetchPrice(coin);
        if (!price) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
        const dirMul = side === "long" ? 1 : -1;
        const sl = slPct ? price * (1 - dirMul * slPct / 100) : 0;
        const tp = tpPct ? [price * (1 + dirMul * tpPct / 100)] : [];
        const symbol = `SODEX:${coin}-USD`;
        const w = W.loadWallet();
        const res = W.openPosition(w, {
          strategy: "AI Trade", symbol, side, entry: price, size: usd * lev, leverage: lev,
          stop_loss: sl, take_profit: tp, reason: `AI Trade chat: ${txt}`,
        } as any);
        if (res.error) { push("bot", `⚠ ${res.error}`); return; }
        const extra = [
          slPct ? `SL: ${sl.toFixed(2)} (-${slPct}%)` : "",
          tpPct ? `TP: ${tp[0].toFixed(2)} (+${tpPct}%)` : "",
        ].filter(Boolean).join(" · ");
        push("bot", t("ai.opened")
          .replace("{S}", side === "long" ? "🟢 LONG" : "🔴 SHORT")
          .replace("{C}", coin).replace("{P}", price.toFixed(2))
          .replace("{U}", fmt$(usd)).replace("{X}", String(lev))
          .replace("{N}", fmt$(usd * lev)) + (extra ? `\n${extra}` : ""));
        return;
      }

      // --- "<coin> signals" (açık istek: sadece signals) ---
      const sigM = up.match(/^([A-Z0-9]{2,8})\s+SIGNALS?$/);
      if (sigM) {
        const coin = sigM[1];
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runSignals(coin);
        return;
      }

      // --- "<coin> etf" (açık istek: sadece ETF) ---
      const etfM = up.match(/^([A-Z0-9]{2,8})\s+ETF$/);
      if (etfM) {
        const coin = etfM[1];
        await runEtf(coin);
        return;
      }

      // --- sadece coin adı: "btc" -> signals + (ETF'si varsa) ETF; "mon" -> sadece signals ---
      const soloM = up.match(/^([A-Z0-9]{2,8})$/);
      if (soloM && symbols.has(soloM[1])) {
        const coin = soloM[1];
        await runSignals(coin);
        if (ETF_ASSETS.has(coin)) await runEtf(coin);
        return;
      }

      // --- market: piyasa yorumlayıcı ---
      if (/^(market|piyasa)$/.test(low)) { await runMarket(); return; }

      // --- hunt: fırsat avcısı (yön filtreli: hunt long / hunt short) ---
      const huntM = low.match(/^(hunt|av|scan)(?:\s+(long|short))?$/);
      if (huntM) { await runHunt(huntM[2] as "long" | "short" | undefined); return; }

      // --- confluence <coin> ---
      const cfM = low.match(/^confluence\s+([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+confluence$/);
      if (cfM) {
        const coin = cfM[1].toUpperCase();
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runConfluence(coin); return;
      }

      // --- compare <a> <b> / <a> vs <b> ---
      const cmpM = low.match(/^compare\s+([a-z0-9]{2,8})\s+(?:vs\s+)?([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+vs\s+([a-z0-9]{2,8})$/);
      if (cmpM) {
        const a = cmpM[1].toUpperCase(), b = cmpM[2].toUpperCase();
        if (!symbols.has(a) || !symbols.has(b)) { push("bot", t("ai.unknown_coin").replace("{C}", !symbols.has(a) ? a : b).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runCompare(a, b); return;
      }

      // --- pnl: portföy özeti ---
      if (/^pnl$/.test(low)) { await runPnl(); return; }

      // --- ssi: index sinyalleri ---
      if (/^ssi$/.test(low)) { await runSsi(); return; }

      // --- funding <coin> ---
      const fundM = low.match(/^funding\s+([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+funding$/) || (low === "funding" ? ([null, "btc"] as any) : null);
      if (fundM) { await runFunding(String(fundM[1]).toUpperCase()); return; }

      // --- "<coin> 4h/1h/15m/5m/1m/1d" timeframe taraması ---
      const tfM = up.match(/^([A-Z0-9]{2,8})\s+(1M|5M|15M|1H|4H|1D)$/);
      if (tfM) {
        const coin = tfM[1];
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runSignals(coin, tfM[2].toLowerCase()); return;
      }

      // --- movers: 24s hareketliler ---
      if (/^(movers|top|gainers|losers)$/.test(low)) { await runMovers(); return; }

      // --- news: haber + sentiment ---
      if (/^(news|haber(ler)?)$/.test(low)) { await runNews(); return; }

      // --- fg: korku endeksi ---
      if (/^(fg|fear|feargreed|korku)$/.test(low)) { await runFg(); return; }

      // --- price: "<coin> price" / "price <coin>" hızlı fiyat ---
      const priceM = up.match(/^([A-Z0-9]{2,8})\s+PRICE$/) || up.match(/^PRICE\s+([A-Z0-9]{2,8})$/);
      if (priceM) {
        const coin = priceM[1];
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        const price = await fetchPrice(coin);
        if (!price) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
        push("bot", `💲 ${coin}: $${price >= 100 ? price.toFixed(2) : price.toFixed(4)}`, [
          { label: `📡 ${coin} ${t("ai.hunt_detail")}`, cmd: coin.toLowerCase() },
          { label: `🟢 ${coin} Long $100 5x`, cmd: `${coin.toLowerCase()} long 100 5x` },
        ]);
        return;
      }

      // --- why <coin>: çok kaynaklı muhakeme ---
      const whyM = low.match(/^why\s+([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+why$/);
      if (whyM) {
        const coin = whyM[1].toUpperCase();
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runWhy(coin); return;
      }

      // --- setup <coin>: ATR bazlı işlem planı ---
      const setupM = low.match(/^setup\s+([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+setup$/);
      if (setupM) {
        const coin = setupM[1].toUpperCase();
        if (!symbols.has(coin)) { push("bot", t("ai.unknown_coin").replace("{C}", coin).replace("{L}", [...symbols].slice(0, 20).join(", ") + "...")); return; }
        await runSetup(coin); return;
      }

      // --- risk: portföy risk kontrolü ---
      if (/^risk$/.test(low)) { await runRisk(); return; }

      // --- closeall: hepsini kapat (close <coin>'den ÖNCE) ---
      if (/^(closeall|close\s+all)$/.test(low)) { await runCloseAll(); return; }

      // --- close: "close btc" / "btc close" pozisyon kapat ---
      const closeM = low.match(/^close\s+([a-z0-9]{2,8})$/) || low.match(/^([a-z0-9]{2,8})\s+close$/);
      if (closeM) {
        const coin = closeM[1].toUpperCase();
        const w = W.loadWallet();
        const matches = w.positions.filter((p) => p.symbol.replace("SODEX:", "").replace("-USD", "") === coin);
        if (!matches.length) { push("bot", t("ai.close_none").replace("{C}", coin)); return; }
        const price = await fetchPrice(coin);
        if (!price) { push("bot", t("ai.no_price").replace("{C}", coin)); return; }
        let cur = w, totalPnl = 0;
        for (const p of matches) { totalPnl += W.calcPnl(p, price); cur = W.closePosition(cur, p.id, price, "AI Trade chat"); }
        push("bot", t("ai.closed")
          .replace("{N}", String(matches.length)).replace("{C}", coin)
          .replace("{P}", price.toFixed(2))
          .replace("{PNL}", `${totalPnl >= 0 ? "+" : ""}${fmt$(totalPnl)}`));
        return;
      }

      // --- positions ---
      if (/^(positions?|pozisyonlar(ım)?)$/.test(low)) {
        const w = W.loadWallet();
        if (!w.positions.length) { push("bot", t("ai.no_positions")); return; }
        const lines = await Promise.all(w.positions.map(async (p) => {
          const coin = p.symbol.replace("SODEX:", "").replace("-USD", "");
          const price = await fetchPrice(coin);
          const pnl = price ? W.calcPnl(p, price) : 0;
          const roe = price ? W.calcRoe(p, price) : 0;
          return `${p.side === "long" ? "🟢" : "🔴"} ${coin} ${p.leverage}x @ ${p.entry.toFixed(2)} → ${price ? price.toFixed(2) : "?"}  PnL: ${pnl >= 0 ? "+" : ""}${fmt$(pnl)} (${roe >= 0 ? "+" : ""}${roe.toFixed(1)}%)`;
        }));
        push("bot", [t("ai.positions_head"), "", ...lines].join("\n"));
        return;
      }

      // --- balance ---
      if (/^(balance|bakiye)$/.test(low)) {
        const w = W.loadWallet();
        push("bot", t("ai.balance").replace("{B}", fmt$(w.balance)).replace("{N}", String(w.positions.length)));
        return;
      }

      // --- help ---
      if (/^(commands|komutlar|help|yardım|\?)$/.test(low)) { push("bot", t("ai.help")); return; }

      // bilinmeyen
      push("bot", t("ai.unknown"));
    } finally {
      setBusy(false);
    }
  }

  const quick = [
    { label: "📜 Commands", cmd: "commands" },
    { label: "🎯 Hunt", cmd: "hunt" },
    { label: "📊 Market", cmd: "market" },
    { label: "🚀 Movers", cmd: "movers" },
    { label: "📰 News", cmd: "news" },
    { label: "😨 F&G", cmd: "fg" },
    { label: "BTC", cmd: "btc" },
  ];

  const send = () => { const v = input; setInput(""); handleCommand(v); };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40, maxWidth: 860 }}>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>{t("ai.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 0, marginBottom: 18 }}>{t("ai.subtitle")}</p>

      {/* chat alanı */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-soft)", height: "55vh", minHeight: 340, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
            <div className="mono" style={{
              whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.55, padding: "10px 14px", borderRadius: 12,
              background: m.role === "user" ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
            }}>{m.text}</div>
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {m.suggestions.map((s) => (
                  <button key={s.cmd} disabled={busy} onClick={() => handleCommand(s.cmd)} className="mono"
                    style={{ padding: "6px 12px", fontSize: 11.5, borderRadius: 16, border: "1px solid var(--border-glow)", background: "var(--bg-soft)", color: "var(--text)", cursor: "pointer" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>{t("ai.thinking")}</div>}
        <div ref={endRef} />
      </div>

      {/* hızlı komutlar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {quick.map((q) => (
          <button key={q.cmd} disabled={busy} onClick={() => handleCommand(q.cmd)} className="mono"
            style={{ padding: "7px 14px", fontSize: 12, borderRadius: 20, border: "1px solid var(--border-glow)", background: "transparent", color: "var(--text-dim)", cursor: "pointer" }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !busy) send(); }}
          placeholder={t("ai.placeholder")}
          className="mono"
          style={{ flex: 1, padding: "12px 14px", background: "var(--bg-soft)", border: "1px solid var(--border-glow)", borderRadius: 10, color: "var(--text)", fontSize: 13, outline: "none" }}
        />
        <button onClick={send} disabled={busy || !input.trim()} className="btn" style={{ padding: "12px 22px", fontWeight: 700, fontSize: 13 }}>{t("ai.send")}</button>
      </div>

      <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>{t("ai.note")}</p>
    </div>
  );
}
