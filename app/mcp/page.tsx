"use client";
// /mcp — MCP connection guide. How to add the Strategy DEX MCP server to AI assistants.
import { useState } from "react";
import Link from "next/link";

const ENDPOINT = "https://straw-pearl.vercel.app/api/mcp";

const TOOLS: { name: string; desc: string }[] = [
  { name: "hunt_setups", desc: "Scan active markets for the strongest LONG/SHORT setups." },
  { name: "analyze_coin", desc: "Full reasoned read of a coin: signals, families, funding, F&G, ETF." },
  { name: "get_market_overview", desc: "Regime, Fear & Greed, dominance, breadth, ETF flows, risk flags." },
  { name: "scan_live_signals", desc: "Run every strategy on a symbol and get what's firing long vs short." },
  { name: "get_trade_setup", desc: "ATR-sized trade plan: direction, SL, TP, suggested leverage." },
  { name: "get_funding", desc: "Perp funding rate and crowd positioning." },
  { name: "get_fear_greed", desc: "Fear & Greed index with weekly trend." },
  { name: "get_news", desc: "Latest SoSoValue headlines with sentiment tone." },
  { name: "get_movers", desc: "24h top gainers and losers." },
  { name: "get_ssi", desc: "SoSoValue index momentum (MAG7, DEFI, MEME)." },
  { name: "get_etf_flows", desc: "SoSoValue spot-ETF flows for an asset." },
  { name: "list_categories", desc: "All strategy categories with counts." },
  { name: "list_strategies", desc: "Strategies by category (id, name)." },
  { name: "backtest_strategy", desc: "Backtest a single strategy on real BTC history." },
];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}
      className="mono"
      style={{ padding: "5px 12px", fontSize: 12, borderRadius: 7, border: "1px solid var(--border-glow)", background: "transparent", color: done ? "var(--green)" : "var(--text-dim)", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      {done ? "✓ copied" : "copy"}
    </button>
  );
}

export default function McpGuidePage() {
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>
          <Link href="/docs" style={{ color: "var(--text-faint)", textDecoration: "none" }}>← Docs</Link>
        </div>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 10, color: "var(--cyan)" }}>🔌 Connect the MCP Server</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 15, lineHeight: 1.7 }}>
          Strategy DEX exposes its full engine as an <strong>MCP (Model Context Protocol) server</strong> — 19 tools any
          AI assistant can call directly. Add the endpoint once, then ask your assistant things like
          <em> &ldquo;where&rsquo;s the strongest setup right now?&rdquo;</em> or <em>&ldquo;analyze SOL&rdquo;</em> and it runs the real engine.
        </p>
      </div>

      {/* Endpoint kutusu */}
      <div className="panel" style={{ padding: 18, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>MCP ENDPOINT</div>
          <div className="mono" style={{ fontSize: 15, color: "var(--cyan)", wordBreak: "break-all" }}>{ENDPOINT}</div>
        </div>
        <Copy text={ENDPOINT} />
      </div>

      {/* Claude */}
      <Section title="Claude (Desktop & Web)" color="var(--accent)">
        <p style={pStyle}>Claude has native MCP support through Connectors. This is the smoothest way to use the server.</p>
        <Steps steps={[
          "Open Claude, go to Settings.",
          "Open the Connectors (or Integrations) section.",
          "Click \"Add custom connector\".",
          <>Paste the endpoint: <Code>{ENDPOINT}</Code></>,
          "Save. Start a new conversation so Claude loads the tools.",
          "Ask naturally — e.g. \"hunt for the best setups\" or \"give me a trade setup for ETH\".",
        ]} />
        <Callout>If you added the connector before and don&rsquo;t see all 19 tools, remove it and add it again so Claude re-reads the tool list, then open a fresh chat.</Callout>
      </Section>

      {/* Cursor / IDE */}
      <Section title="Cursor / Windsurf / IDEs" color="var(--purple)">
        <p style={pStyle}>MCP-capable editors accept the server via a small JSON config. Add this to your MCP settings file:</p>
        <CodeBlock text={`{
  "mcpServers": {
    "strategy-dex": {
      "url": "${ENDPOINT}"
    }
  }
}`} />
        <p style={pStyle}>Reload the editor. The 19 tools appear in the assistant&rsquo;s tool list.</p>
      </Section>

      {/* Generic MCP client */}
      <Section title="Any MCP client (generic)" color="var(--green)">
        <p style={pStyle}>The server speaks <strong>MCP over JSON-RPC 2.0</strong> using the Streamable HTTP transport. Point any compliant client at the endpoint — no API key, no SDK, read-only.</p>
        <ul style={ulStyle}>
          <li style={liStyle}><strong>Transport:</strong> Streamable HTTP (POST for calls, GET for discovery)</li>
          <li style={liStyle}><strong>Protocol version:</strong> 2024-11-05</li>
          <li style={liStyle}><strong>Auth:</strong> none (CORS-enabled, public, read-only tools)</li>
        </ul>
      </Section>

      {/* Test */}
      <Section title="Verify it's live" color="#f5a623">
        <p style={pStyle}>Open the endpoint in a browser — a GET returns the server info and tool list:</p>
        <CodeBlock text={ENDPOINT} />
        <p style={pStyle}>Or call a tool directly with curl:</p>
        <CodeBlock text={`curl -X POST ${ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"scan_live_signals","arguments":{"symbol":"BTC"}}}'`} />
      </Section>

      {/* Tools */}
      <Section title="The 19 tools" color="var(--cyan)">
        <p style={pStyle}>Once connected, natural language is enough — the assistant picks the right tool.</p>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {TOOLS.map((t) => (
            <div key={t.name} className="panel" style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 13, color: "var(--cyan)", minWidth: 170 }}>{t.name}</span>
              <span style={{ color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{t.desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Example prompts */}
      <Section title="Example prompts" color="var(--green)">
        <ul style={ulStyle}>
          {[
            ["Where's the strongest setup in the market right now?", "hunt_setups"],
            ["Analyze SOL for me.", "analyze_coin"],
            ["How does the market look today?", "get_market_overview"],
            ["Which strategies are long on MON?", "scan_live_signals"],
            ["Give me a trade plan for ETH.", "get_trade_setup"],
            ["What's BTC funding doing?", "get_funding"],
            ["What are the BTC ETF flows?", "get_etf_flows"],
          ].map(([q, tool], i) => (
            <li key={i} style={liStyle}>&ldquo;{q}&rdquo; <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>→ {tool}</span></li>
          ))}
        </ul>
      </Section>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
        <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7 }}>
          Full technical reference: <a href="https://github.com/muammeryldrm42/straw/blob/main/MCP.md" target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)", textDecoration: "none" }}>MCP.md</a>.
          The server is read-only — informational tools only, no trading or account access. Nothing here is financial advice.
        </p>
      </div>
    </div>
  );
}

const pStyle: React.CSSProperties = { color: "var(--text-dim)", fontSize: 14, lineHeight: 1.7, marginBottom: 12 };
const ulStyle: React.CSSProperties = { margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 };
const liStyle: React.CSSProperties = { color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.6 };

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 34 }}>
      <h2 className="display" style={{ fontSize: 20, color, marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 9 }}>
      {steps.map((s, i) => <li key={i} style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>{s}</li>)}
    </ol>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <span className="mono" style={{ fontSize: 12.5, color: "var(--cyan)", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 5, wordBreak: "break-all" }}>{children}</span>;
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <pre className="mono" style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", fontSize: 12.5, color: "var(--text)", overflowX: "auto", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{text}</pre>
      <div style={{ position: "absolute", top: 8, right: 8 }}><Copy text={text} /></div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", marginTop: 10 }}>
      <p style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>💡 {children}</p>
    </div>
  );
}
