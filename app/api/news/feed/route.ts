import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SoSoValue genel haber akışı (featured DEĞİL): /openapi/v1/news
// Sürekli akan tüm haberler. Aynı SOSOVALUE_API_KEY kullanılır.
// Mevcut featured/currency route'una dokunulmadı; bu ayrı bir endpoint.
const LANG_MAP: Record<string, string> = {
  en: "en", tr: "tr", es: "es", fr: "fr", de: "en",
  ru: "ru", zh: "zh", ja: "ja", ko: "en", pt: "pt",
};

// matched_currencies[].name bazen düz string ("BTC"), bazen çok dilli obje
// ({"en":"CL",...}) ya da JSON string olarak gelir. Sembolü güvenle çıkar.
function pickCur(c: any, lang: string): string {
  let v: any = c?.name ?? c?.symbol ?? "";
  if (typeof v === "string" && v.trim().startsWith("{")) {
    try { v = JSON.parse(v); } catch { /* düz string */ }
  }
  if (v && typeof v === "object") {
    v = v[lang] || v.en || Object.values(v)[0] || "";
  }
  return typeof v === "string" ? v.trim() : "";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const lang = searchParams.get("lang") || "en";
  const cats = searchParams.get("cats") || "";
  const key = process.env.SOSOVALUE_API_KEY;

  if (!key) return NextResponse.json({ items: [], error: "no-key" });

  try {
    const apiLang = LANG_MAP[lang] || "en";
    const catParam = cats ? `&category=${cats}` : "";
    const url = `https://openapi.sosovalue.com/openapi/v1/news?page=${page}&page_size=100&language=${apiLang}${catParam}`;
    const res = await fetch(url, {
      headers: { "x-soso-api-key": key, Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return NextResponse.json({ items: [], error: `http-${res.status}` });
    const j = await res.json();
    const data = j?.data || {};
    const list: any[] = data.list || [];
    const items = list.map((n) => ({
      id: String(n.id),
      sourceLink: n.source_link || n.original_link || "",
      releaseTime: n.release_time || 0,
      author: n.author || n.nick_name || "",
      authorAvatarUrl: n.author_avatar_url || "",
      category: n.category || 1,
      featureImage: n.feature_image || "",
      tags: Array.isArray(n.tags) ? n.tags.filter((x: any) => typeof x === "string") : [],
      currencies: (n.matched_currencies || [])
        .map((c: any) => pickCur(c, apiLang))
        .filter((s: string) => s && s.length <= 12),
      title: n.title || "",
      content: n.content || "",
    })).filter((n: any) => n.title);
    const total = Number(data.total || 0);
    const ps = Number(data.page_size || 100);
    return NextResponse.json({ items, page: Number(page), totalPages: ps > 0 ? Math.ceil(total / ps) : 1 });
  } catch {
    return NextResponse.json({ items: [], error: "exception" });
  }
}
