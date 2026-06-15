import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SoSoValue sıcak/trend haberler: /openapi/v1/news/hot
// Sade yapı (görsel/yazar yok); NewsItem formatına normalize edilir.
// Aynı SOSOVALUE_API_KEY. Mevcut news route'larına dokunulmadı.
const LANG_MAP: Record<string, string> = {
  en: "en", tr: "tr", es: "es", fr: "fr", de: "en",
  ru: "ru", zh: "zh", ja: "ja", ko: "en", pt: "pt",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const lang = searchParams.get("lang") || "en";
  const key = process.env.SOSOVALUE_API_KEY;

  if (!key) return NextResponse.json({ items: [], error: "no-key" });

  try {
    const apiLang = LANG_MAP[lang] || "en";
    const url = `https://openapi.sosovalue.com/openapi/v1/news/hot?page=${page}&page_size=100&language=${apiLang}`;
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
      sourceLink: n.source_link || "",
      releaseTime: n.create_time || 0,
      author: "",
      authorAvatarUrl: "",
      category: 1,
      featureImage: "",
      tags: [],
      currencies: [],
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
