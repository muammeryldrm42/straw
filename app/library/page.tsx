"use client";
import { useState } from "react";
import Link from "next/link";
import { STRATEGIES, Category, ALL_CATEGORIES } from "@/lib/registry";
import CodeViewer from "@/components/CodeViewer";
import { useT } from "@/lib/i18n";

export default function Library() {
  const { t } = useT();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = STRATEGIES.filter((s) => {
    if (filter !== "all" && s.category !== filter) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.short || "").toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      t(`cat.${s.category}`).toLowerCase().includes(q)
    );
  });

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 48 }}>
      <h1 className="display" style={{ fontSize: 32, marginBottom: 8 }}>{t("lib.title")}</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
        {STRATEGIES.length} {t("lib.strats_word")} · {ALL_CATEGORIES.length} {t("lib.cats_word")} · {t("lib.oss_word")}
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("lib.search_placeholder")}
        className="mono"
        style={{ width: "100%", maxWidth: 420, padding: "10px 14px", marginBottom: 16, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 14, outline: "none" }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        <button className={`btn ${filter === "all" ? "btn-primary" : ""}`} onClick={() => setFilter("all")} style={{ padding: "8px 16px", fontSize: 13 }}>
          {t("common.all")}
        </button>
        {ALL_CATEGORIES.map((c) => (
          <button key={c} className={`btn ${filter === c ? "btn-primary" : ""}`} onClick={() => setFilter(c)} style={{ padding: "8px 16px", fontSize: 13 }}>
            {t(`cat.${c}`)}
          </button>
        ))}
      </div>

      <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 16 }}>
        {list.length} {t("lib.found")}
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-faint)", padding: 40, textAlign: "center" }}>{t("lib.no_results")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map((s) => {
            const isOpen = open === s.id;
            return (
              <div key={s.id} id={s.id} className="panel fade-up" style={{ overflow: "hidden", scrollMarginTop: 80 }}>
                <button onClick={() => setOpen(isOpen ? null : s.id)} style={{
                  width: "100%", textAlign: "left", padding: 20, background: "transparent", border: "none", cursor: "pointer", color: "var(--text)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span className={`tag tag-${s.category}`}>{t(`cat.${s.category}`)}</span>
                      <span className="display" style={{ fontSize: 18 }}>{s.name}</span>
                      {!s.run && <span className="mono" style={{ fontSize: 10, color: "var(--amber)" }}>OFF-CHAIN</span>}
                    </div>
                    <span style={{ color: "var(--text-dim)", fontSize: 20 }}>{isOpen ? "−" : "+"}</span>
                  </div>
                  <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 8 }}>{s.short}</p>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 20px" }}>
                    <p style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 16 }}>{s.description}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 8 }}>
                      <div className="panel" style={{ padding: 14, background: "var(--bg-soft)" }}>
                        <div className="mono long" style={{ fontSize: 11, marginBottom: 6 }}>▸ {t("strat.entry").toUpperCase()}</div>
                        <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6 }}>{s.entry}</p>
                      </div>
                      <div className="panel" style={{ padding: 14, background: "var(--bg-soft)" }}>
                        <div className="mono short" style={{ fontSize: 11, marginBottom: 6 }}>▸ {t("strat.exit").toUpperCase()} / RISK</div>
                        <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6 }}>{s.exit}</p>
                      </div>
                    </div>
                    {s.offchainNote && (
                      <div className="panel" style={{ padding: 14, marginBottom: 16, background: "rgba(255,184,0,.06)", borderColor: "rgba(255,184,0,.3)" }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--amber)" }}>⚠ {s.offchainNote}</span>
                      </div>
                    )}
                    <div style={{ marginTop: 16, marginBottom: 16 }}>
                      <CodeViewer slug={s.slug} category={s.category} langs={s.langs} />
                    </div>
                    {s.run && (
                      <Link href={`/demo?strategy=${s.id}`} className="btn btn-primary" style={{ fontSize: 13 }}>
                        ⚡ {t("strat.demo_btn")}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
