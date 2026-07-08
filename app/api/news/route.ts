import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tek news route'u: tüm sekmeler yeni SoSoValue API ailesinden (openapi/v1) çekilir.
//   mode=hot  -> /openapi/v1/news/hot   (Hot sekmesi)
//   mode=feed -> /openapi/v1/news       (Feed + News/Research/Macro; cats ile kategori filtresi)
// Eski api/v1/news/featured/currency endpoint'i tamamen bırakıldı.
const LANG_MAP: Record<string, string> = {
  en: "en", tr: "tr", es: "es", fr: "fr", de: "en",
  ru: "ru", zh: "zh", ja: "ja", ko: "en", pt: "pt",
};

// matched_currencies[].name düz string ya da çok dilli obje/JSON olabilir; sembolü güvenle çıkar + normalize et.
function pickCur(c: any, lang: string): string {
  let v: any = c?.name ?? c?.symbol ?? c?.ticker ?? "";
  if (typeof v === "string" && v.trim().startsWith("{")) { try { v = JSON.parse(v); } catch { /* düz string */ } }
  if (v && typeof v === "object") { v = v[lang] || v.en || Object.values(v).find((x) => typeof x === "string") || ""; }
  let s = typeof v === "string" ? v.trim() : "";
  if (!s && c?.fullName) s = String(c.fullName).trim();
  // normalize: baştaki $ ve boşlukları temizle, büyük harf
  s = s.replace(/^\$+/, "").replace(/\s+/g, "").toUpperCase();
  return s;
}

// Geçerli ticker: 1-12 karakter, en az bir harf, alfanümerik + nokta (sadece-sayı / garip semboller elenir).
function isValidTicker(s: string): boolean {
  return !!s && s.length <= 12 && /[A-Z]/.test(s) && /^[A-Z0-9.]+$/.test(s);
}

// Yalnızca çok net/tek anlamlı kelimelerde yön; belirsiz/karışık başlıkta null (etiket yok).
// Her zaman İngilizce başlıktan hesaplanır ki dil değişince etiket tutarlı kalsın.
// Ağırlıklı + negation-duyarlı sentiment. Yalnızca tek taraf NET baskınsa etiketler; karışık/zayıf başlıklarda null (sallamasyon yok).
function newsSentiment(title: string): "bullish" | "bearish" | null {
  const t = " " + (title || "").toLowerCase() + " ";
  const bull: [string, number][] = [
    ["surge", 3], ["surges", 3], ["surged", 3], ["soar", 3], ["soars", 3], ["soared", 3], ["skyrocket", 3], ["skyrockets", 3], ["rockets", 3], ["moons", 3],
    ["all-time high", 3], ["record high", 3], ["new high", 2], ["breakout", 2], ["breaks out", 2], ["bullish", 2], ["jumps", 2], ["jumped", 2],
    ["rally", 2], ["rallies", 2], ["rallied", 2], ["approval", 2], ["approved", 2], ["adoption", 2], ["adopts", 2], ["inflow", 2], ["inflows", 2],
    ["partnership", 1], ["integration", 1], ["integrates", 1], ["institutional", 1], ["upgrade", 1], ["gains", 1], ["rises", 1], ["climbs", 1], ["surpasses", 1],
  ];
  const bear: [string, number][] = [
    ["hack", 3], ["hacked", 3], ["exploit", 3], ["exploited", 3], ["stolen", 3], ["theft", 3], ["scam", 3], ["rug pull", 3], ["rugpull", 3],
    ["crash", 3], ["crashes", 3], ["crashed", 3], ["plunge", 3], ["plunges", 3], ["plunged", 3], ["plummet", 3], ["plummets", 3], ["plummeted", 3],
    ["collapse", 3], ["collapses", 3], ["bankruptcy", 3], ["bankrupt", 3], ["liquidated", 2], ["liquidation", 2], ["sell-off", 2], ["selloff", 2],
    ["bearish", 2], ["dumps", 2], ["dump", 2], ["delist", 2], ["delisted", 2], ["outflow", 2], ["outflows", 2], ["sec charges", 2], ["slump", 2], ["tumbles", 2],
    ["lawsuit", 1], ["charged", 1], ["ban", 1], ["banned", 1], ["downgrade", 1], ["warning", 1], ["halt", 1],
  ];
  // negation: kelimenin hemen öncesinde iptal edici varsa o sinyali yok say
  const neg = [" no ", " not ", "denied", "rejected", "averted", "avoided", "lifted", "dismissed", "dropped", "fails to", "recover", "rebound", "ends", "halts a"];
  const score = (list: [string, number][]): number => {
    let sc = 0;
    for (const [w, wt] of list) {
      const idx = t.indexOf(w);
      if (idx < 0) continue;
      const ctx = t.slice(Math.max(0, idx - 22), idx);
      if (neg.some((nw) => ctx.includes(nw))) continue;
      sc += wt;
    }
    return sc;
  };
  const bs = score(bull);
  const rs = score(bear);
  // NET olmalı: bir taraf en az 2 puan ve diğerinden en az 2 puan baskın
  if (bs >= 2 && bs - rs >= 2) return "bullish";
  if (rs >= 2 && rs - bs >= 2) return "bearish";
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const lang = searchParams.get("lang") || "en";
  const mode = searchParams.get("mode") || "feed"; // feed | hot
  const cats = searchParams.get("cats") || "";
  const key = process.env.SOSOVALUE_API_KEY;

  if (!key) return NextResponse.json({ items: [], error: "no-key" });

  try {
    const apiLang = LANG_MAP[lang] || "en";
    // Hot: eski çalışan endpoint. Feed/sentiment: yeni resmi /api/v1/news/featured/currency (currencyId'siz = tüm haberler).
    const buildUrl = (lng: string) => mode === "hot"
      ? `https://openapi.sosovalue.com/openapi/v1/news/hot?page=${page}&page_size=100&language=${lng}`
      : `https://openapi.sosovalue.com/api/v1/news/featured/currency?pageNum=${page}&pageSize=100&language=${lng}&categoryList=1,2,3,4,5,6,7,9,10`;

    let list: any[] = [];
    let anyOk = false;
    let total = 0;
    let ps = 100;
    {
      const res = await fetch(buildUrl(apiLang), { headers: { "x-soso-api-key": key, Accept: "application/json" }, next: { revalidate: 60 } });
      if (res.ok) {
        anyOk = true;
        const j = await res.json();
        const d = j?.data || j || {};
        list = (d.list as any[]) || [];
        total = Number(d.total || 0);
        ps = Number(d.page_size || d.pageSize || 100);
      }
    }
    if (!anyOk) return NextResponse.json({ items: [], error: "upstream" });

    // Sentiment fallback: seçili dil İngilizce değilse İngilizce başlıktan hesaplanır (etiket tutarlı kalsın).
    const enTitle: Record<string, string> = {};
    if (apiLang !== "en") {
      try {
        const enRes = await fetch(buildUrl("en"), { headers: { "x-soso-api-key": key, Accept: "application/json" }, next: { revalidate: 60 } });
        if (enRes.ok) {
          const enJson = await enRes.json();
          const ed = enJson?.data || enJson || {};
          (ed.list || []).forEach((n: any) => { enTitle[String(n.id)] = (n.title || (n.multilanguageContent?.find?.((m: any) => m.language === "en")?.title) || ""); });
        }
      } catch { /* İngilizce alınamazsa seçili dilden hesaplanır */ }
    }

    const items = list.map((n) => {
      const id = String(n.id);
      // title/content düz alanda ya da multilanguageContent[] içinde olabilir
      const mlc = Array.isArray(n.multilanguageContent) ? n.multilanguageContent : [];
      const pick = (lng: string) => mlc.find?.((m: any) => m.language === lng);
      const title = n.title || pick(apiLang)?.title || pick("en")?.title || "";
      const content = n.content || pick(apiLang)?.content || pick("en")?.content || "";
      const tForSent = apiLang === "en" ? title : (enTitle[id] || title);
      // Sentiment: API verirse onu kullan, yoksa başlıktan hesapla
      const apiSent = n.sentiment === "bullish" || n.sentiment === "bearish" ? n.sentiment : null;
      return {
        id,
        sourceLink: n.sourceLink || n.source_link || n.original_link || "",
        releaseTime: n.releaseTime || n.release_time || n.create_time || 0,
        author: n.author || n.nick_name || "",
        authorAvatarUrl: n.authorAvatarUrl || n.author_avatar_url || "",
        category: n.category || 1,
        featureImage: n.featureImage || n.feature_image || "",
        tags: Array.isArray(n.tags) ? n.tags.filter((x: any) => typeof x === "string") : [],
        currencies: Array.from(new Set(((n.matchedCurrencies || n.matched_currencies || n.matchedCurrency || []) as any[]).map((c: any) => pickCur(c, apiLang)).filter(isValidTicker))),
        title,
        content,
        sentiment: apiSent || newsSentiment(tForSent),
      };
    }).filter((n: any) => n.title);
    return NextResponse.json({ items, page: Number(page), totalPages: ps > 0 ? Math.ceil(total / ps) : 1 });
  } catch {
    return NextResponse.json({ items: [], error: "exception" });
  }
}
