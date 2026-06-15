import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SoSoValue SSI endeksleri + makro olaylar. Şema dokümandan doğrulandı:
//  GET /indices                         -> data: ["ssimag7","ssilayer1",...] (çıplak ticker dizisi)
//  GET /indices/{ticker}/market-snapshot-> data: {price, 24h_change_pct, 7day_roi, 1month_roi, 3month_roi, ytd}
//  GET /macro/events                    -> data: [{date, events:[...]}]
// Yanıtlar {code,message,data} ile sarılı; biz data'yı alıyoruz. Oranlar 0-1 (ör. 0.275 = %27.5).
const BASE = "https://openapi.sosovalue.com/openapi/v1";

async function sfetch(path: string, key: string): Promise<any> {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { "x-soso-api-key": key, Accept: "application/json" }, next: { revalidate: 120 } });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data ?? null;
  } catch { return null; }
}

export async function GET() {
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return NextResponse.json({ indices: [], macro: [], error: "no-key" });

  // 1) index ticker listesi (çıplak string dizisi)
  const tickersRaw = await sfetch("/indices", key);
  const tickers: string[] = Array.isArray(tickersRaw) ? tickersRaw.filter((t) => typeof t === "string") : [];

  // 2) her index için market-snapshot (paralel)
  const snaps = await Promise.all(tickers.map(async (tk) => {
    const s = await sfetch(`/indices/${tk}/market-snapshot`, key);
    if (!s || typeof s !== "object") return null;
    return {
      ticker: tk,
      price: Number(s.price ?? 0),
      change24h: Number(s["24h_change_pct"] ?? s.change_pct_24h ?? s.change_24h ?? 0),
      roi7d: Number(s["7day_roi"] ?? s.roi_7d ?? s["7d_roi"] ?? 0),
      roi1m: Number(s["1month_roi"] ?? s.roi_1m ?? s["1m_roi"] ?? 0),
      roi3m: Number(s["3month_roi"] ?? s.roi_3m ?? s["3m_roi"] ?? 0),
      ytd: Number(s.ytd ?? s.ytd_roi ?? 0),
    };
  }));
  const indices = snaps.filter(Boolean);

  // 3) makro olaylar (tarih + olay isimleri)
  const macroRaw = await sfetch("/macro/events", key);
  const macro = Array.isArray(macroRaw)
    ? macroRaw.map((m: any) => ({ date: String(m?.date ?? ""), events: Array.isArray(m?.events) ? m.events.filter((e: any) => typeof e === "string") : [] })).filter((m: any) => m.date)
    : [];

  // teşhis: ham snapshot ve macro örneği
  let rawSnap: any = null;
  if (tickers.length > 0) rawSnap = await sfetch(`/indices/${tickers[0]}/market-snapshot`, key);

  return NextResponse.json({
    indices,
    macro,
    diag: {
      tickers: tickers.length,
      tickerList: tickers,
      snaps: indices.length,
      macroDays: macro.length,
      rawSnapSample: rawSnap,
      rawMacroSample: Array.isArray(macroRaw) ? macroRaw.slice(0, 3) : macroRaw,
    },
  });
}
