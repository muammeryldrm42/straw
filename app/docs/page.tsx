"use client";
// Docs — kullanıcı için site içi dokümantasyon. Sol tarafta başlıklar, sağ tarafta açıklamalar.
// Her ana yüzey (nav + AI Trade + Telegram + MCP) bir bölüm. Additive: yeni sayfa, mevcut hiçbir şeye dokunmaz.
import { useState, useEffect } from "react";
import Link from "next/link";

interface Sub { h: string; label: string; body: string[] }
interface Sec { id: string; icon: string; title: string; color: string; href?: string; intro: string; detail?: string; subs: Sub[] }

const SECTIONS: Sec[] = [
  {
    id: "ai-trade", icon: "🤖", title: "AI Trade", color: "var(--green)", href: "/ai-trade",
    intro: "A command-driven chat terminal wired to every real engine on the site. Instead of clicking through pages, you type a command the way you'd message a person — hunt, market, btc, why sol — and it answers in one readable message, pulling from the strategy library, the ETF layer, live market data and the demo wallet.",
    detail: "It is deliberately NOT an LLM. There is no language model guessing numbers — it's a deterministic command engine running the exact same open-source strategies the rest of the site uses. That means every number is real and reproducible, and when a data source is missing it says so honestly rather than inventing a figure. The chat persists as you navigate and supports every listed market.",
    subs: [
      { h: "", label: "Market intelligence", body: [
        "hunt — the flagship command. It pulls the most active markets, runs every one of the 270+ strategies on each, computes a net conviction score (long confidence minus short confidence) and ranks the strongest LONG and SHORT setups, each with one-tap buttons to dig deeper. Use hunt long or hunt short to focus one direction.",
        "market — a full read of the tape in a single message: regime with confidence, Fear & Greed with an interpretive label, BTC dominance and Altseason, market breadth, BTC and ETH ETF net flows, the engine's risk flags, and the playbook bias for how to trade the current regime.",
        "movers — 24h top gainers and losers. news — latest SoSoValue headlines with a bullish/bearish tone. fg — Fear & Greed with its weekly trend. ssi — SoSoValue index momentum. funding <coin> — perp funding and what the crowd positioning implies." ] },
      { h: "", label: "Coin analysis", body: [
        "Just type a ticker (btc, sol, mon) for a full strategy scan plus ETF flows in one shot — no command word needed.",
        "why <coin> — the deepest read: it fuses five independent evidence layers (the strategy tally, strategy-family consensus, funding, Fear & Greed and ETF flows) into a single LONG / SHORT / mixed verdict, showing each layer's contribution so you can see the reasoning, not just the answer.",
        "setup <coin> — an ATR-sized trade plan. It reads the coin's real volatility (Average True Range) and places a stop at 1.5x ATR and a target at 3x ATR (a 1:2 risk/reward), then suggests leverage scaled to how volatile the coin is — wider and lower-leverage for choppy coins, tighter for calm ones.",
        "confluence <coin> shows which strategy families agree; compare a b puts two coins head-to-head; and any timeframe works (btc 4h, sol 15m)." ] },
      { h: "", label: "Trading from chat (demo)", body: [
        "btc long 100 5x sl 2 tp 5 opens a real demo position — $100 size, 5x leverage, 2% stop, 5% take-profit — in the same virtual wallet as the Demo Trade page, so positions are shared between the two.",
        "positions lists open trades, pnl shows equity and realized/unrealized profit, risk checks your exposure and concentration (warning if you're over-leveraged or too concentrated in one coin or direction), and close / closeall exit positions.",
        "commands (or help) prints the full grouped command reference at any time." ] },
    ],
  },
  {
    id: "telegram", icon: "✈️", title: "Telegram Bot", color: "#229ED9", href: "https://t.me/STRATEGYDEX_bot",
    intro: "The same market-intelligence and coin-analysis engine, delivered on Telegram. Send /hunt, /market or just a ticker and you get live strategy scans, ETF flows, funding and Fear & Greed right in your chat — no app to open.",
    detail: "The bot is a thin client: it doesn't re-implement any logic, it calls the site's own APIs and formats the result for chat. Because it's event-driven (it only wakes when you message it) it needs no always-on server and runs on a free plan. It's information-only by design — no trading is exposed on Telegram, so it stays safe and stateless.",
    subs: [
      { h: "", label: "Using it", body: [
        "Open t.me/STRATEGYDEX_bot and send /start for a welcome menu with tappable buttons (Hunt, Market, Movers, News, Fear & Greed, SSI, ETF, and more).",
        "Market intel: /hunt, /market, /movers, /news, /fg, /ssi, /funding <coin>. Coin analysis: /coin, /signals, /etf, /why, /setup, /confluence, /compare, /price.",
        "Bare tickers work too — just send btc. Coin replies come with Why / Setup buttons so you can drill in with one tap; those buttons only appear on real coin queries, not on general commands." ] },
    ],
  },
  {
    id: "library", icon: "📚", title: "Strategy Library", color: "var(--cyan)", href: "/library",
    intro: "A searchable, filterable catalog of 270+ trading strategies across 31 categories. Every strategy ships with a plain-language description, its entry and exit logic, full copy-paste source code, and a one-click Run in Demo shortcut.",
    detail: "The library is the foundation everything else is built on. Every strategy — from a simple RSI cross to a multi-signal Smart Money Concepts model — implements the same contract: a run(candles) function that returns a Signal (long/short/neutral, with entry, stop, targets, confidence and a reason). Because all 270+ speak that one shape, the platform can scan, backtest, demo and expose any of them uniformly. Nothing is a black box; every signal traces back to code you can read.",
    subs: [
      { h: "", label: "What's inside", body: [
        "Categories span Smart Money Concepts, classic indicators, candlestick and chart patterns, oscillators, volume and volatility studies, moving-average systems, harmonic patterns, momentum, statistical/mean-reversion models, multi-signal hybrids, price action, and popular TradingView favorites (TTM Squeeze, WaveTrend, UT Bot, SSL, QQE, HalfTrend, Hull Suite and more), plus crypto-bot styles like Grid, DCA and Martingale.",
        "Each entry shows the logic in words, the executable source, and links straight into Demo Trade so you can watch it behave. The engine design is documented in STRATEGY.md." ] },
    ],
  },
  {
    id: "signals", icon: "📡", title: "Active Signals", color: "var(--accent)", href: "/signals",
    intro: "Runs every strategy on live data and shows, at a glance, how many are currently firing long versus short on each market — each with the reason it fired.",
    detail: "This is a breadth tool, not a single indicator. One strategy saying 'long' is noise; forty independent methods leaning the same way is signal. The long-vs-short count tells you how much of the library agrees right now, which is a very different (and often more robust) read than any one oscillator.",
    subs: [
      { h: "", label: "How to read it", body: [
        "A lopsided count (e.g. 38 long / 4 short) means broad agreement — many unrelated methods see the same thing. A split count (20/18) means the market is undecided; smaller size and tighter risk make sense there.",
        "Every signal is backed by open-source code in the Library, so you can always click through to see exactly why it fired. From here you can take any signal into Demo Trade and watch whether it actually plays out — the honest test of any signal." ] },
    ],
  },
  {
    id: "backtest", icon: "🔬", title: "Backtest", color: "#f5a623", href: "/backtest",
    intro: "A two-engine backtest that replays strategies day by day on real historical data, the way each signal would actually have behaved. It exists to answer the honest question the Wave 2 judges asked for: does this hold up over time, or does it just look good live?",
    detail: "Both engines walk history forward one bar at a time with no look-ahead — at each day they only know what was knowable then. Results are grouped by category so you can see which families of strategies actually earned their keep.",
    subs: [
      { h: "", label: "The two engines", body: [
        "Skills Backtest — runs each of the 24 skills long-only against a Buy & Hold BTC benchmark. A 'beat' tag marks the skills that outperformed simply holding — the honest bar, since beating buy-and-hold is harder than it sounds.",
        "Strategy Backtest — replays all 272 strategies both long and short, with low-risk controls (a minimum hold period and a trading-cost assumption so results aren't inflated by unrealistic churn), on real CMC OHLCV data." ] },
      { h: "", label: "What each row reports", body: [
        "Return — total profit/loss over the tested window. Sharpe — return adjusted for volatility (higher means smoother, more reliable gains). Max Drawdown — the worst peak-to-trough drop, i.e. the pain you'd have endured. Win rate — share of trades that were profitable. Exposure — how much of the time the strategy was actually in a position.",
        "Strategies that never triggered in the tested window show an honest 'no signal in this period' instead of a fake 0% — a gap is reported as a gap. Full methodology is in BACKTEST.md." ] },
    ],
  },
  {
    id: "skills-signal", icon: "🦅", title: "Skills Signal", color: "var(--red)", href: "/skills-signal",
    intro: "A regime-adaptive engine of 24 skills running across the top pairs. Each skill resolves into bullish, bearish or neutral, and the engine weights them by the current market regime — the same signals matter more or less depending on whether the market is trending, ranging or in a washout.",
    detail: "It reads real inputs — Fear & Greed, Altcoin Season, BTC trend — to decide the regime, then adapts. Crucially, it never fabricates: if a data source fails, that input returns null rather than a made-up value, so a degraded read is visibly degraded, not silently wrong.",
    subs: [
      { h: "", label: "Why it's trustworthy", body: [
        "These are exactly the 24 skills the Backtest validates. What you see live is the same logic that was replayed on history — so the live signal and its track record come from one source, not two disconnected systems." ] },
    ],
  },
  {
    id: "etf", icon: "💹", title: "ETF Flows", color: "#f5a623", href: "/etf",
    intro: "The SoSoValue institutional-flow layer. It tracks 12 US and 3 HK spot ETFs with daily and cumulative net flow, total AUM, and a per-fund breakdown (IBIT, FBTC, GBTC and the rest) — an institutional read that no price chart can give you.",
    detail: "Flows are the footprint of large, slow money. Sustained net inflows are quiet accumulation; persistent outflows are distribution. Because this often leads or confirms price, it's one of the layers the AI Trade why and market commands fold into their verdict.",
    subs: [
      { h: "", label: "How to read it", body: [
        "Daily net flow is today's inflow minus outflow across all funds. Cumulative is the running total since launch — the big-picture accumulation trend. AUM is total assets held. The per-fund breakdown shows who's driving the move (e.g. BlackRock's IBIT vs Grayscale's GBTC, which have very different flow patterns).",
        "Green sustained inflows alongside flat price can signal quiet accumulation before a move; red outflows into strength can warn of distribution." ] },
    ],
  },
  {
    id: "news", icon: "📰", title: "News", color: "var(--cyan)", href: "/news",
    intro: "The SoSoValue research feed with a sentiment layer. Each headline is tagged bullish, bearish or neutral, and the page summarises the overall tone so you can read the mood of the market at a glance.",
    detail: "The sentiment classifier is weighted and negation-aware — it doesn't just count positive words, it understands that 'not bullish' isn't bullish. The tone summary aggregates the recent feed so a wall of headlines becomes a single readable signal.",
    subs: [],
  },
  {
    id: "ssi", icon: "🧭", title: "SSI Signals", color: "#14b8a6", href: "/signals?scope=ssi",
    intro: "An index-momentum scanner built on SoSoValue Indices: MAG7.ssi (mega-cap coins), DEFI.ssi (DeFi blue-chips) and MEME.ssi (memecoins). Instead of one coin, it reads the health of an entire theme at once.",
    detail: "For each index, every constituent coin is run through all strategies, then combined with BTC trend and the index's live 24h move into a five-step bias, from Strong Buy to Strong Sell. It answers 'is DeFi strong right now?' or 'are memes rolling over?' with evidence, not vibes.",
    subs: [
      { h: "", label: "How to use it", body: [
        "The five-step bias (Strong Buy → Buy → Neutral → Sell → Strong Sell) gives a quick directional read per theme. An All-Time scan covers every timeframe at once, and tapping any index card drills into the per-coin breakdown so you can see which constituents are carrying or dragging the theme." ] },
    ],
  },
  {
    id: "demo", icon: "⚡", title: "Demo Trade", color: "var(--green)", href: "/demo",
    intro: "A full virtual trading terminal with a demo balance. Pick any strategy from a searchable picker, open long or short positions with leverage, and track live PnL and ROE as prices move — all with fake money, so you can test ideas risk-free.",
    detail: "It's the honest proving ground: take a signal from Active Signals or a setup from AI Trade, open it here, and watch whether it actually works out. Every open and closed position can generate a shareable PnL result card.",
    subs: [
      { h: "", label: "Shared wallet", body: [
        "The demo wallet is shared with AI Trade — a position opened by a chat command (btc long 100 5x) appears here, and one opened here shows up in the chat's positions and pnl. One book, two ways to drive it." ] },
    ],
  },
  {
    id: "playground", icon: "</>", title: "Playground", color: "var(--purple)", href: "/playground",
    intro: "An isolated code playground where you write your own strategy to the same run(candles) → Signal contract the built-in strategies use. If your function returns a valid Signal, the whole platform can run it.",
    detail: "Your code executes in a sandboxed Web Worker with no DOM and no network access, and nothing is sent to the server — it's safe to experiment freely. This is where the '270+' becomes 'as many as you can write': the contract is open, so the library is extensible by anyone.",
    subs: [],
  },
  {
    id: "mcp", icon: "🔌", title: "MCP Server", color: "var(--cyan)", href: "/mcp",
    intro: "Strategy DEX exposes its entire engine as an MCP (Model Context Protocol) server at /api/mcp — 14 tools any AI assistant (Claude and others) can call directly over JSON-RPC 2.0, with no API key and no SDK. This makes the platform AI-native.",
    detail: "The same engine that powers the website, AI Trade and the Telegram bot answers an assistant's calls — there's no separate 'AI version' of the logic. An assistant can ask 'where's the strongest setup right now?' and get a real, reasoned answer straight from the engine. See the step-by-step connection guide at /mcp, or the full reference in MCP.md.",
    subs: [
      { h: "", label: "The 14 tools", body: [
        "Strategy engine: list_categories, list_strategies, scan_live_signals (what's firing on any market), backtest_strategy.",
        "Market hunter: hunt_setups (best opportunities), analyze_coin (reasoned verdict), get_trade_setup (ATR plan), get_leaderboard (conviction ranking).",
        "Analytics: get_volatility, get_correlation, explain_strategy, get_price_history.",
        "Market data: get_market_overview, get_funding, get_fear_greed, get_news, get_movers, get_ssi, get_etf_flows.",
        "Everything is read-only — informational tools only, no trading or account access, safe to connect publicly." ] },
    ],
  },
];

export default function DocsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const onScroll = () => {
      let cur = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(`doc-${s.id}`);
        if (el && el.getBoundingClientRect().top <= 120) cur = s.id;
      }
      setActive(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(`doc-${id}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 8 }}>Documentation</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 15, lineHeight: 1.6, maxWidth: 720 }}>
          Everything Strategy DEX does and how to use it. Each section below maps to a surface you can open from the top menu or the home page.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) 1fr", gap: 40, alignItems: "start" }}>
        {/* sol: sticky başlık listesi */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "start" }} className="docs-sidebar">
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 8,
                  background: active === s.id ? "rgba(255,255,255,0.06)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                  color: active === s.id ? "var(--text)" : "var(--text-dim)",
                  fontSize: 13.5, fontWeight: active === s.id ? 600 : 400, transition: "all .12s",
                  borderLeft: active === s.id ? `2px solid ${s.color}` : "2px solid transparent",
                }}
              >
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                {s.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* sağ: açıklamalar */}
        <main style={{ minWidth: 0 }}>
          {SECTIONS.map((s) => (
            <section key={s.id} id={`doc-${s.id}`} style={{ marginBottom: 44, scrollMarginTop: 90 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <h2 className="display" style={{ fontSize: 24, color: s.color, margin: 0 }}>{s.title}</h2>
                {s.href && (
                  s.href.startsWith("http")
                    ? <a href={s.href} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 12, color: "var(--text-faint)", textDecoration: "none", marginLeft: "auto" }}>open ↗</a>
                    : <Link href={s.href} className="mono" style={{ fontSize: 12, color: "var(--text-faint)", textDecoration: "none", marginLeft: "auto" }}>open →</Link>
                )}
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 14.5, lineHeight: 1.7, marginBottom: s.detail ? 14 : (s.subs.length ? 20 : 0) }}>{s.intro}</p>
              {s.detail && <p style={{ color: "var(--text-faint)", fontSize: 14, lineHeight: 1.7, marginBottom: s.subs.length ? 20 : 0 }}>{s.detail}</p>}

              {s.subs.map((sub, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  {sub.label && <h3 style={{ fontSize: 14, color: "var(--text)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sub.label}</h3>}
                  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
                    {sub.body.map((b, j) => (
                      <li key={j} style={{ color: "var(--text-dim)", fontSize: 13.5, lineHeight: 1.6 }}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
            <p className="mono" style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.7 }}>
              Deeper technical docs in the repo: README, STRATEGY.md, BACKTEST.md, AI-TRADE.md.
            </p>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .docs-sidebar { display: none; }
          .container > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
