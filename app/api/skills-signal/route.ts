import { NextResponse } from "next/server";
import { runEngine } from "@/lib/skillsEngine";
import { SKILLS } from "@/lib/skillsEngine/skills";
import type { CoinInput, MarketSignals, Globals } from "@/lib/skillsEngine/types";
import { rsi, macd } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gerçek Altcoin Season Index — CMC keyless public (key yok). Başarısızsa null (çağıran taraf proxy'ye düşer).
async function fetchAltseasonIndex(): Promise<number | null> {
  const ua = { "User-Agent": "Mozilla/5.0 (compatible; StrategyDEX/1.0)", Accept: "application/json" } as Record<string, string>;
  try {
    const r = await fetch("https://pro-api.coinmarketcap.com/trial-pro-api/v1/altcoin-season-index/latest", { headers: ua, cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const raw = d?.data?.value ?? d?.data?.altcoinSeasonIndex ?? d?.data?.altcoin_season_index ?? d?.data?.[0]?.value;
      const v = parseInt(raw, 10);
      if (isFinite(v) && v >= 0 && v <= 100) return v;
    }
  } catch { /* proxy'ye düşer */ }
  return null;
}

// Gerçek Fear & Greed — birden fazla public kaynak denenir (key yok). Hiçbiri olmazsa null döner (sahte hesap yapılmaz).
async function fetchFearGreed(): Promise<number | null> {
  const ua = { "User-Agent": "Mozilla/5.0 (compatible; StrategyDEX/1.0)", Accept: "application/json" } as Record<string, string>;
  // 1) CoinMarketCap keyless public (CMC F&G index — yaygın referans değeri)
  try {
    const r = await fetch("https://pro-api.coinmarketcap.com/trial-pro-api/v3/fear-and-greed/latest", { headers: ua, cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const v = parseInt(d?.data?.value ?? d?.data?.[0]?.value, 10);
      if (isFinite(v)) return v;
    }
  } catch { /* sonraki kaynağa geç */ }
  // 2) alternative.me (yedek)
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=1", { headers: ua, cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      const v = parseInt(d?.data?.[0]?.value, 10);
      if (isFinite(v)) return v;
    }
  } catch { /* yok */ }
  return null;
}

// CoinGecko (public, key yok) — SoSoValue'da olmayan market cap / dominance / total mcap buradan.
async function fetchCoinGecko(): Promise<{ g: any; btc: any; eth: any }> {
  try {
    const ua = { "User-Agent": "Mozilla/5.0 (compatible; StrategyDEX/1.0)", Accept: "application/json" };
    const [gRes, mRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/global", { headers: ua, next: { revalidate: 600 } }),
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum", { headers: ua, next: { revalidate: 600 } }),
    ]);
    const g = gRes.ok ? (await gRes.json())?.data : null;
    const mk = mRes.ok ? await mRes.json() : [];
    const byId: Record<string, any> = {};
    (Array.isArray(mk) ? mk : []).forEach((c: any) => { byId[c.id] = c; });
    return { g, btc: byId["bitcoin"] || null, eth: byId["ethereum"] || null };
  } catch {
    return { g: null, btc: null, eth: null };
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function pctAgo(c: number[], d: number): number {
  const n = c.length, i = n - 1 - d;
  return i >= 0 && c[i] ? ((c[n - 1] - c[i]) / c[i]) * 100 : 0;
}

// Tek coin'in 1d klines'ından CoinInput üretir (CMC yok — her şey SoDEX mumundan).
async function coinFromKlines(base: string, symbol: string, origin: string): Promise<CoinInput | null> {
  try {
    const r = await fetch(`${origin}/api/klines?symbol=${encodeURIComponent(symbol)}&interval=1d`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const d = await r.json();
    const candles: any[] = d.candles || [];
    if (candles.length < 20) return null;
    const closes = candles.map((c) => Number(c.close)).filter((x) => isFinite(x));
    if (closes.length < 20) return null;
    const rsiArr = rsi(closes, 14);
    const m = macd(closes);
    const lastClose = closes[closes.length - 1];
    const lastVol = Number(candles[candles.length - 1].volume) || 0;
    return {
      symbol: base, name: base, marketCap: 0,
      volume24h: lastVol * lastClose || 1e9,
      pctChange24h: pctAgo(closes, 1),
      pctChange7d: pctAgo(closes, 7),
      pctChange30d: pctAgo(closes, 30),
      pctChange90d: pctAgo(closes, 90),
      rsi: rsiArr[rsiArr.length - 1],
      macdHistogram: m.histogram[m.histogram.length - 1],
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  // 77 Top Symbol — Active Signals ile aynı havuz (SoDEX perp crypto).
  const mkRes = await fetch(`${origin}/api/sodex-markets`, { next: { revalidate: 300 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const markets: any[] = (mkRes?.markets || []).filter((m: any) => m?.base && m?.symbol);
  if (!markets.length) return NextResponse.json({ error: "no-markets" });

  // klines'ları batch'ler halinde çek (rate limit/timeout dostu).
  const coins: CoinInput[] = [];
  const BATCH = 12;
  for (let i = 0; i < markets.length; i += BATCH) {
    const slice = markets.slice(i, i + BATCH);
    const res = await Promise.all(slice.map((m) => coinFromKlines(m.base, `SODEX:${m.symbol}`, origin)));
    for (const c of res) if (c) coins.push(c);
  }
  if (!coins.length) return NextResponse.json({ error: "no-data" });

  const btc = coins.find((c) => c.symbol === "BTC");
  const btc7 = btc?.pctChange7d ?? 0;
  const btc30 = btc?.pctChange30d ?? 0;

  // --- market-wide sinyaller, CMC yerine klines breadth'inden ---
  const adv24 = coins.filter((c) => c.pctChange24h > 0).length;
  const adv7 = coins.filter((c) => c.pctChange7d > 0).length;
  const avg24 = coins.reduce((a, c) => a + c.pctChange24h, 0) / coins.length;
  // altseason: önce gerçek Altcoin Season Index (CMC keyless), yoksa proxy (BTC'yi 7d'de geçen coin oranı)
  const beatBtc = coins.filter((c) => c.symbol !== "BTC" && c.pctChange7d > btc7).length;
  const altProxy = clamp(Math.round((beatBtc / Math.max(1, coins.length - 1)) * 100), 0, 100);
  const altReal = await fetchAltseasonIndex();
  const altseason = altReal ?? altProxy;
  // fear&greed: gerçek (alternative.me) → yoksa BTC momentum proxy
  // Fear & Greed: önce client'tan gelen gerçek değer (tarayıcı IP'si ile alternative.me'den), sonra server fetch.
  // Sahte momentum-bazlı tahmin KALDIRILDI; gerçek veri yoksa nötr 50 (engine çökmesin diye), UI gerçek olmadığını belirtir.
  const fgParam = parseInt(new URL(req.url).searchParams.get("fg") || "", 10);
  const fgClient = isFinite(fgParam) && fgParam >= 0 && fgParam <= 100 ? fgParam : null;
  const fgReal = fgClient ?? (await fetchFearGreed());
  const fearGreed = fgReal ?? 50;
  const fgIsReal = fgReal != null;
  // dominance trend proxy: altlar BTC'yi yeniyorsa dominance düşer (negatif)
  const btcDominanceTrend = clamp(-(altseason - 50) / 10, -5, 5);

  // CoinGecko (public): gerçek market cap (BTC/ETH) + dominance + total/stablecoin mcap
  const cg = await fetchCoinGecko();
  if (cg.btc) { const c = coins.find((x) => x.symbol === "BTC"); if (c) { c.marketCap = cg.btc.market_cap || 0; c.volume24h = cg.btc.total_volume || c.volume24h; } }
  if (cg.eth) { const c = coins.find((x) => x.symbol === "ETH"); if (c) { c.marketCap = cg.eth.market_cap || 0; c.volume24h = cg.eth.total_volume || c.volume24h; } }
  const mcp = cg.g?.market_cap_percentage || {};
  const totalMcap = cg.g?.total_market_cap?.usd || 0;
  const stableMcap = totalMcap ? (((mcp.usdt || 0) + (mcp.usdc || 0) + (mcp.dai || 0) + (mcp.busd || 0)) / 100) * totalMcap : null;
  const btcDom = mcp.btc || 55;
  const ethDom = mcp.eth || 18;

  const market: MarketSignals = {
    fearGreed,
    altseasonIndex: altseason,
    btcDominance: btcDom,
    btcDominanceTrend,
    btcReturn7d: btc7,
    btcReturn30d: btc30,
  };
  const globals: Globals = {
    totalMarketCap: totalMcap,
    stablecoinMarketCap: stableMcap,
    ethDominance: ethDom,
    breadth: {
      universe: coins.length,
      advancers24h: adv24,
      decliners24h: coins.length - adv24,
      advancers7d: adv7,
      decliners7d: coins.length - adv7,
      avgChange24h: avg24,
    },
  };

  const decision = runEngine({
    asOf: new Date().toISOString(),
    market,
    coins,
    opts: { fullScan: true, minVolume: 0, topN: 100, confidenceScaling: true },
  });

  // 24 skill, yalnızca BTC + ETH için. Hiçbir public kaynaktan beslenemeyip BTC/ETH verdict'i üretemeyen skill'ler çıkarılır.
  const rawSkills = SKILLS.map((s) => ({
    id: s.id, name: s.name, summary: s.summary, entry: s.entry, exit: s.exit, inputs: s.inputs,
    verdicts: s.evaluate({ market, coins, globals }).filter((v) => v.symbol === "BTC" || v.symbol === "ETH"),
  }));
  const skills = rawSkills.filter((s) => s.verdicts.length > 0);

  return NextResponse.json({ decision, skills, breadth: globals.breadth, scanned: coins.length, fgIsReal });
}
