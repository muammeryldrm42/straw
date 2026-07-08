"use client";
import { useEffect, useState, useCallback } from "react";
import { useT } from "@/lib/i18n";

interface NewsItem {
  id: string; sourceLink: string; releaseTime: number; author: string; authorAvatarUrl: string;
  category: number; featureImage: string; tags: string[]; currencies: string[]; title: string; content: string;
  sentiment?: "bullish" | "bearish" | null;
}

const CAT_FILTERS: { key: string; label: string; cats: string; mode: string; sentiment?: "bullish" | "bearish" }[] = [
  { key: "hot", label: "news.cat_hot", cats: "", mode: "hot" },
  { key: "bullish", label: "news.cat_bullish", cats: "", mode: "feed", sentiment: "bullish" },
  { key: "bearish", label: "news.cat_bearish", cats: "", mode: "feed", sentiment: "bearish" },
];

function timeAgo(ms: number, lang: string): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (h < 24) return `${h}h`;
  if (d < 30) return `${d}d`;
  try { return new Date(ms).toLocaleDateString(lang); } catch { return new Date(ms).toLocaleDateString(); }
}

export default function NewsPage() {
  const { t, lang } = useT();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState("hot");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const active = CAT_FILTERS.find((c) => c.key === cat) || CAT_FILTERS[0];
  const cats = active.cats;
  const mode = active.mode;
  const sentimentFilter = active.sentiment;

  const load = useCallback(async (p: number, replace: boolean) => {
    setLoading(true); setError(null);
    try {
      if (sentimentFilter) {
        // Bullish/Bearish: tüm kaynaklardan tara (feed kategori filtresi olmadan News/Research/Macro'yu da kapsar + Hot ayrıca), birleştir, dedupe, sentiment'e göre süz.
        const urls = [
          `/api/news?lang=${lang}&page=${p}&mode=feed`,
          `/api/news?lang=${lang}&page=${p}&mode=hot`,
        ];
        const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json()).catch(() => ({ items: [] }))));
        const merged: NewsItem[] = results.flatMap((d) => d.items || []);
        const seen = new Set<string>();
        const dedup = merged.filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
        const filtered = dedup.filter((n) => n.sentiment === sentimentFilter);
        const maxTp = Math.max(...results.map((d) => d.totalPages || 1), 1);
        setTotalPages(maxTp);
        setItems((prev) => (replace ? filtered : [...prev, ...filtered]));
      } else {
        const r = await fetch(`/api/news?lang=${lang}&page=${p}&mode=${mode}${cats ? `&cats=${cats}` : ""}`);
        const d = await r.json();
        if (d.error) setError(d.error);
        setTotalPages(d.totalPages || 1);
        setItems((prev) => (replace ? d.items || [] : [...prev, ...(d.items || [])]));
      }
    } catch {
      setError("exception");
    } finally {
      setLoading(false);
    }
  }, [lang, cats, mode, sentimentFilter]);

  useEffect(() => { setPage(1); load(1, true); }, [lang, cat, load]);

  const catColor = (c: number) => c === 2 || c === 6 ? "var(--purple)" : c === 5 ? "var(--accent)" : c === 10 ? "var(--green)" : "var(--text-dim)";

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <h1 className="display" style={{ fontSize: 26 }}>{t("news.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginTop: 4, marginBottom: 4 }}>{t("news.subtitle")}</p>
      <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 0, marginBottom: 18 }}>News is for informational purposes only, not financial or trading signals.</p>

      {/* kategori filtre */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {CAT_FILTERS.map((c) => {
          const on = cat === c.key;
          return (
            <button key={c.key} onClick={() => setCat(c.key)} className="mono" style={{
              padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              background: on ? "var(--green)" : "var(--bg-soft)", color: on ? "#04150d" : "var(--text-dim)",
              border: "1px solid " + (on ? "transparent" : "var(--border-glow)"), fontWeight: on ? 700 : 400,
            }}>{t(c.label)}</button>
          );
        })}
      </div>

      {error === "no-key" && (
        <div className="panel" style={{ padding: 16, borderLeft: "3px solid var(--accent)", marginBottom: 16, fontSize: 13, color: "var(--text-dim)" }}>
          SoSoValue API anahtarı ayarlı değil. Vercel proje ayarlarından <span className="mono" style={{ color: "var(--accent)" }}>SOSOVALUE_API_KEY</span> environment variable'ını ekleyin (ücretsiz: sosovalue.com/developer).
        </div>
      )}
      {error && error !== "no-key" && (
        <div className="panel" style={{ padding: 16, color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{t("news.error")}</div>
      )}

      {items.length === 0 && loading && (
        <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>{t("news.loading")}</div>
      )}
      {items.length === 0 && !loading && !error && (
        <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>{t("news.empty")}</div>
      )}

      {/* kart grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {items.map((n) => (
          <div key={n.id} className="panel" onClick={() => setSelected(n)} style={{ padding: 0, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}>
            {n.featureImage && (
              <div style={{ width: "100%", height: 150, overflow: "hidden", background: "var(--bg-soft)" }}>
                <img src={n.featureImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
            )}
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 9, color: catColor(n.category), border: `1px solid ${catColor(n.category)}`, borderRadius: 3, padding: "1px 6px", textTransform: "uppercase" }}>
                  {n.category === 2 ? t("news.cat_research") : n.category === 3 ? t("news.cat_institution") : n.category === 4 ? t("news.cat_kol") : n.category === 7 ? t("news.cat_official") : n.category === 13 ? t("news.cat_stock") : t("news.cat_news")}
                </span>
                {n.currencies.slice(0, 4).map((c) => <span key={c} className="mono" style={{ fontSize: 9, color: "var(--accent)" }}>{c}</span>)}
                {n.currencies.length > 4 && <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>+{n.currencies.length - 4}</span>}
                {n.sentiment && (
                  <span className="mono" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: n.sentiment === "bullish" ? "var(--green)" : "var(--red)" }}>{n.sentiment === "bullish" ? "Bullish" : "Bearish"}</span>
                )}
                <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginLeft: "auto" }}>{timeAgo(n.releaseTime, lang)}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{n.title}</div>
              {n.author && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", paddingTop: 4 }}>
                  {n.authorAvatarUrl && <img src={n.authorAvatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} loading="lazy" />}
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{n.author}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* load more */}
      {items.length > 0 && page < totalPages && (
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button onClick={() => { const np = page + 1; setPage(np); load(np, false); }} disabled={loading} className="btn btn-primary" style={{ padding: "10px 28px" }}>
            {loading ? "···" : t("news.load_more")}
          </button>
        </div>
      )}

      {/* detay modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} className="panel" style={{ maxWidth: 760, width: "100%", padding: 0, overflow: "hidden" }}>
            {selected.featureImage && <img src={selected.featureImage} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover" }} />}
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                {selected.authorAvatarUrl && <img src={selected.authorAvatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
                <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>{selected.author}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{timeAgo(selected.releaseTime, lang)}</span>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
              <h2 className="display" style={{ fontSize: 20, marginBottom: 14, lineHeight: 1.3 }}>{selected.title}</h2>
              <div className="news-content" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)" }} dangerouslySetInnerHTML={{ __html: selected.content }} />
              {selected.sourceLink && (
                <a href={selected.sourceLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: "inline-block", marginTop: 20, padding: "9px 18px" }}>
                  {t("news.read_source")}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .news-content img, .news-content picture { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        .news-content a { color: var(--green); text-decoration: underline; }
        .news-content p { margin: 10px 0; }
        .news-content h1, .news-content h2, .news-content h3 { margin: 16px 0 8px; font-weight: 700; }
        .news-content ul, .news-content ol { margin: 10px 0; padding-left: 22px; }
        .news-content blockquote { border-left: 3px solid var(--border-glow); padding-left: 12px; color: var(--text-dim); margin: 12px 0; }
        .news-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .news-content td, .news-content th { border: 1px solid var(--border); padding: 6px 10px; font-size: 13px; }
      `}</style>
    </div>
  );
}
