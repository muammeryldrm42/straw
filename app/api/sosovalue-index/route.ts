import { NextResponse } from "next/server";

// SoSoValue Index (SSI) — endeks listesi + her endeksin market snapshot'ı.
//   GET /indices                                  -> ["ssimag7", "ssilayer1", ...]
//   GET /indices/{ticker}/market-snapshot         -> { price, 24h_change_pct, 7day_roi, 1month_roi, 3month_roi, 1year_roi, ytd }
// Container'dan erişilemez (whitelist); yalnızca Vercel'de SOSOVALUE_API_KEY ile çalışır.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://openapi.sosovalue.com/openapi/v1";

// ticker (lowercase) -> ekranda görünen güzel isim. Bilinmeyen ticker'lar büyük harfle gösterilir.
const NAMES: Record<string, string> = {
  ssicefi: "ssiCeFi", ssidefi: "ssiDeFi", ssilayer1: "ssiLayer1", ssisocialfi: "ssiSocialFi",
  ssimag7: "ssiMAG7", ssipayfi: "ssiPayFi", ssimeme: "ssiMeme", ssirwa: "ssiRWA",
  ssiai: "ssiAI", ssilayer2: "ssiLayer2", ssinft: "ssiNFT", ssidepin: "ssiDePIN", ssigamefi: "ssiGameFi",
};

const num = (v: any): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && isFinite(n) ? n : null;
};

export async function GET() {
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return NextResponse.json({ indices: [], error: "missing_key" }, { status: 200 });
  const headers = { "x-soso-api-key": key } as Record<string, string>;

  // 1) endeks listesi (bare array ya da {data:[...]} olabilir)
  let tickers: string[] = [];
  try {
    const r = await fetch(`${BASE}/indices`, { headers, next: { revalidate: 300 } });
    if (r.ok) {
      const j = await r.json();
      const arr = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
      tickers = arr.filter((x: any) => typeof x === "string");
    }
  } catch { /* boş kalır */ }

  if (tickers.length === 0) return NextResponse.json({ indices: [], error: "no_indices" }, { status: 200 });

  // 2) her endeks için snapshot (bare obje ya da {data:{...}} olabilir)
  const rows = await Promise.all(
    tickers.map(async (tk) => {
      try {
        const r = await fetch(`${BASE}/indices/${encodeURIComponent(tk)}/market-snapshot`, { headers, next: { revalidate: 300 } });
        if (!r.ok) return null;
        const j = await r.json();
        const s = j?.data && typeof j.data === "object" ? j.data : j;
        const lower = tk.toLowerCase();
        return {
          ticker: tk,
          name: NAMES[lower] || tk.toUpperCase(),
          price: num(s?.price),
          change24h: num(s?.["24h_change_pct"]),
          roi7d: num(s?.["7day_roi"]),
          roi1m: num(s?.["1month_roi"]),
          roi3m: num(s?.["3month_roi"]),
          roi1y: num(s?.["1year_roi"]),
          ytd: num(s?.ytd),
        };
      } catch {
        return null;
      }
    })
  );

  const indices = rows.filter((x): x is NonNullable<typeof x> => !!x);
  return NextResponse.json({ indices, count: indices.length });
}
