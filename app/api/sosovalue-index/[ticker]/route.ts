import { NextRequest, NextResponse } from "next/server";

// Tek endeksin detayları: bileşenler (constituents) + 3 aylık günlük klines.
//   GET /indices/{ticker}/constituents  -> [{ currency_id, symbol, weight }]
//   GET /indices/{ticker}/klines        -> [{ timestamp, open, high, low, close }]  (sadece 1d, son 3 ay)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://openapi.sosovalue.com/openapi/v1";

export async function GET(_req: NextRequest, { params }: { params: { ticker: string } }) {
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return NextResponse.json({ constituents: [], klines: [], error: "missing_key" });
  const headers = { "x-soso-api-key": key } as Record<string, string>;
  const tk = params.ticker;

  let constituents: { symbol: string; weight: number }[] = [];
  try {
    const r = await fetch(`${BASE}/indices/${encodeURIComponent(tk)}/constituents`, { headers, next: { revalidate: 600 } });
    if (r.ok) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
      constituents = arr
        .map((c: any) => ({ symbol: String(c?.symbol || "").toUpperCase(), weight: Number(c?.weight) || 0 }))
        .filter((c: any) => c.symbol)
        .sort((a: any, b: any) => b.weight - a.weight);
    }
  } catch { /* boş */ }

  let klines: { t: number; c: number }[] = [];
  try {
    const r = await fetch(`${BASE}/indices/${encodeURIComponent(tk)}/klines?interval=1d&limit=120`, { headers, next: { revalidate: 600 } });
    if (r.ok) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
      klines = arr
        .map((k: any) => ({ t: Number(k?.timestamp), c: Number(k?.close) }))
        .filter((k: any) => isFinite(k.t) && isFinite(k.c))
        .sort((a: any, b: any) => a.t - b.t);
    }
  } catch { /* boş */ }

  return NextResponse.json({ ticker: tk, constituents, klines });
}
