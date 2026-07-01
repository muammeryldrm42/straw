"use client";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";

const LANG_LABEL: Record<string, string> = {
  python: "Python", typescript: "TypeScript", pinescript: "Pine Script",
};
const LANG_EXT: Record<string, string> = {
  python: "py", typescript: "ts", pinescript: "pine",
};

export default function CodeViewer({ slug, category, langs }: {
  slug: string; category: string; langs: string[];
}) {
  const { t } = useT();
  const [active, setActive] = useState(langs[0]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    const ext = LANG_EXT[active];
    fetch(`/code/${category}__${slug}.${ext}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((txt) => setCode(txt))
      .catch(() => setCode("// Code could not be loaded"))
      .finally(() => setLoading(false));
  }, [active, slug, category]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="panel" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", padding: "0 8px" }}>
        <div style={{ display: "flex" }}>
          {langs.map((l) => (
            <button key={l} onClick={() => setActive(l)} style={{
              padding: "12px 16px", background: "transparent", border: "none",
              borderBottom: active === l ? "2px solid var(--green)" : "2px solid transparent",
              color: active === l ? "var(--green)" : "var(--text-dim)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13, cursor: "pointer", fontWeight: 500,
            }}>{LANG_LABEL[l]}</button>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={copy} style={{ padding: "6px 12px", fontSize: 12 }}>
          {copied ? `✓ ${t("strat.copied")}` : t("strat.copy")}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: 18, overflow: "auto", maxHeight: 460,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.6,
        color: "var(--text)", background: "var(--bg-soft)",
      }}>
        <code>{loading ? "// loading..." : code}</code>
      </pre>
    </div>
  );
}
