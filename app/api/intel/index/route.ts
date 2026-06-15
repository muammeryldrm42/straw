import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tek bir SSI endeksinin detayı: fiyat grafiği (klines) + kurucu coinler (constituents).
//  GET /indices/{ticker}/klines?interval=1d  -> data: [{timestamp, open, high, low, close}]
//  GET /indices/{ticker}/constituents        -> data: [{currency_id, symbol, weight}] (weight 0-1)
const BASE = "https://openapi.sosovalue.com/openapi/v1";

async function sfetch(path: string, key: string): Promise<any> {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { "x-soso-api-key": key, Accept: "application/json" }, next: { revalidate: 300 } });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return NextResponse.json({ error: "no-key" });
  if (!ticker) return NextResponse.json({ error: "no-ticker" });

  const [klRaw, coRaw] = await Promise.all([
    sfetch(`/indices/${ticker}/klines?interval=1d&limit=120`, key),
    sfetch(`/indices/${ticker}/constituents`, key),
  ]);

  const klines = Array.isArray(klRaw)
    ? klRaw.map((k: any) => ({ t: Number(k.timestamp), c: Number(k.close) })).filter((k: any) => k.t && isFinite(k.c))
    : [];
  const constituents = Array.isArray(coRaw)
    ? coRaw.map((c: any) => ({ symbol: String(c.symbol ?? "").toUpperCase(), weight: Number(c.weight ?? 0) })).filter((c: any) => c.symbol).sort((a: any, b: any) => b.weight - a.weight)
    : [];

  return NextResponse.json({ klines, constituents });
}
