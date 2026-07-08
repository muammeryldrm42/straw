"use client";
import Link from "next/link";
import { STRATEGIES, ALL_CATEGORIES } from "@/lib/registry";
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
          { t: t("home.fai.title"), d: t("home.fai.body"), h: "/ai-trade", c: "var(--green)", ext: false },
          { t: t("home.ftg.title"), d: t("home.ftg.body"), h: "https://t.me/STRATEGYDEX_bot", c: "#229ED9", ext: true },
          { t: t("home.f1.title"), d: t("home.f1.body").replace("{N}", String(STRATEGIES.length)).replace("{C}", String(ALL_CATEGORIES.length)), h: "/library", c: "var(--cyan)", ext: false },
          { t: t("home.f2.title"), d: t("home.f2.body"), h: "/demo", c: "var(--green)", ext: false },
          { t: t("home.f4.title"), d: t("home.f4.body"), h: "/signals", c: "var(--accent)", ext: false },
          { t: t("home.f3.title"), d: t("home.f3.body"), h: "/playground", c: "var(--purple)", ext: false },
          { t: t("home.f5.title"), d: t("home.f5.body"), h: "/skills-signal", c: "var(--red)", ext: false },
          { t: t("home.f6.title"), d: t("home.f6.body"), h: "/news", c: "var(--cyan)", ext: false },
          { t: t("home.f7.title"), d: t("home.f7.body"), h: "/etf", c: "#f5a623", ext: false },
          { t: t("home.f8.title"), d: t("home.f8.body"), h: "/signals?scope=ssi", c: "#14b8a6", ext: false },
          { t: t("home.fmcp.title"), d: t("home.fmcp.body"), h: "/mcp", c: "var(--cyan)", ext: false },
          { t: t("home.fdocs.title"), d: t("home.fdocs.body"), h: "/docs", c: "var(--text-dim)", ext: false },
        ].map((x) => (
          x.ext ? (
            <a key={x.t} href={x.h} target="_blank" rel="noopener noreferrer" className="panel" style={{ padding: 24, transition: "all .15s", display: "block" }}>
              <div className="display" style={{ fontSize: 20, color: x.c, marginBottom: 10 }}>{x.t}</div>
              <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>{x.d}</p>
            </a>
          ) : (
            <Link key={x.t} href={x.h} className="panel" style={{ padding: 24, transition: "all .15s", display: "block" }}>
              <div className="display" style={{ fontSize: 20, color: x.c, marginBottom: 10 }}>{x.t}</div>
              <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>{x.d}</p>
            </Link>
          )
        ))}
      </section>
    </main>
  );
}
