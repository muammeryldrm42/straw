"use client";
import Link from "next/link";
import { STRATEGIES, byCategory, ALL_CATEGORIES } from "@/lib/registry";
import { useT } from "@/lib/i18n";

export default function Home() {
  const { t } = useT();
  return (
    <main className="container" style={{ paddingTop: 64, paddingBottom: 48 }}>
      <section className="fade-up" style={{ textAlign: "center", padding: "48px 0 64px" }}>
        <div className="mono" style={{ color: "var(--green)", fontSize: 13, letterSpacing: "0.3em", marginBottom: 16 }}>
          // {STRATEGIES.length} STRATEGIES · {ALL_CATEGORIES.length} CATEGORIES · DEMO TRADE
        </div>
        <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 1.05, marginBottom: 20 }}>
          STRATEGY <span style={{ color: "var(--green)", textShadow: "var(--shadow-green)" }}>DEX</span>
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: 18, maxWidth: 660, margin: "0 auto 36px", lineHeight: 1.6 }}>
          {t("home.hero_sub")}
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/demo" className="btn btn-primary">⚡ {t("home.cta_demo")}</Link>
          <Link href="/signals" className="btn">📡 {t("nav.signals")}</Link>
          <Link href="/library" className="btn">📚 {t("home.cta_browse")}</Link>
          <Link href="/playground" className="btn btn-ghost">{"</>"} {t("home.cta_play")}</Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 48 }}>
        {[
          { t: t("home.f1.title"), d: t("home.f1.body").replace("{N}", String(STRATEGIES.length)).replace("{C}", String(ALL_CATEGORIES.length)), h: "/library", c: "var(--cyan)" },
          { t: t("home.f2.title"), d: t("home.f2.body"), h: "/demo", c: "var(--green)" },
          { t: t("home.f4.title"), d: t("home.f4.body"), h: "/signals", c: "var(--accent)" },
          { t: t("home.f3.title"), d: t("home.f3.body"), h: "/playground", c: "var(--purple)" },
          { t: t("home.f5.title"), d: t("home.f5.body"), h: "/skills-signal", c: "var(--red)" },
          { t: t("home.f6.title"), d: t("home.f6.body"), h: "/news", c: "var(--cyan)" },
          { t: t("home.f7.title"), d: t("home.f7.body"), h: "/etf", c: "#f5a623" },
          { t: t("home.f8.title"), d: t("home.f8.body"), h: "/signals?scope=ssi", c: "#14b8a6" },
        ].map((x) => (
          <Link key={x.t} href={x.h} className="panel" style={{ padding: 24, transition: "all .15s", display: "block" }}>
            <div className="display" style={{ fontSize: 20, color: x.c, marginBottom: 10 }}>{x.t}</div>
            <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>{x.d}</p>
          </Link>
        ))}
      </section>

      <section>
        <div className="display" style={{ fontSize: 24, marginBottom: 8 }}>STRATEGIES</div>
        <p className="mono" style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 24 }}>{STRATEGIES.length} {t("lib.found")} · {ALL_CATEGORIES.length} {t("cat.smc").includes("/") ? "" : ""}categories</p>
        {ALL_CATEGORIES.map((cat) => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              <span className={`tag tag-${cat}`}>{t(`cat.${cat}`)}</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {byCategory(cat).map((s) => (
                <Link key={s.id} href={`/library#${s.id}`} className="panel" style={{ padding: 16, display: "block", transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                    {!s.run && <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>OFF-CHAIN</span>}
                  </div>
                  <p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.5 }}>{s.short}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
