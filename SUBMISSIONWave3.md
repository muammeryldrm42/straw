# Strategy DEX — Wave 3 Submission

**Live:** https://straw-pearl.vercel.app
**Repo:** https://github.com/muammeryldrm42/straw
**Stack:** Next.js 14 · TypeScript · Vercel · 10 languages
**Uses the SoSoValue API:** ETF flows, news/research, SSI signals

---

## TL;DR

Strategy DEX is a research-and-prototyping surface for crypto traders: a live market board, an
open-source library of 270+ strategies, an active signal scanner, a regime-adaptive skill engine, a
demo trading terminal and an isolated code playground — now joined in Wave 3 by a full **historical
backtesting suite** and a set of **SoSoValue-powered data layers** (ETF flows, news sentiment, SSI signals).

This document focuses on **what is new since the Wave 2 evaluation**, because at the moment Wave 2 was
judged the site exposed only its first four surfaces. Everything in section 4 was added afterwards and
is the substance of this Wave 3 submission.

---

## 1. The two pieces of feedback, and how Wave 3 answers them

The Wave 2 evaluation summarised the project as: *"plenty to use — a strategy library, live scanner,
leverage terminal and isolated code playground; valuable as an educational and prototyping surface. The
missing depth is more SoSoValue-specific differentiation and better historical validation of signals."*

Wave 3 is built directly around those two sentences:

| Feedback | Wave 3 answer |
|----------|---------------|
| **More SoSoValue-specific differentiation** | Three new data layers built **on the SoSoValue API**: ETF Flows, Crypto News with sentiment, and SSI signals — none of which exist on a generic TA site. |
| **Better historical validation of signals** | A complete **Backtest** suite that replays both the 24-skill engine and all 272 strategies on real BTC history, with an honest buy-&-hold benchmark and a full methodology document (`BACKTEST.md`). |

---

## 2. What was live at the Wave 2 evaluation

For context, these four surfaces were already present and judged:

- **Market** — live prices across crypto, stocks, commodities and indices, with one-tap jump into demo
  or signals.
- **Active Signal Scanner** — runs every strategy on live data and lists the ones currently firing.
- **Strategy Library** — 270+ open-source strategies across ~30 categories.
- **Demo Trade + Playground** — a SoDEX-connected demo terminal (virtual balance, 1x-25x leverage) and
  an isolated Web-Worker playground for writing your own strategy in JavaScript.

These remain, unchanged, as the base of the product.

---

## 3. Architecture at a glance

- **Frontend / API:** Next.js 14 App Router, TypeScript, server-side API routes, deployed zero-config on
  Vercel.
- **Internationalisation:** every surface ships in 10 languages (en, tr, es, fr, de, ru, zh, ja, ko, pt).
- **Data sources:** CoinMarketCap (price/OHLCV, Fear & Greed, dominance, Altcoin Season) and **SoSoValue**
  (ETF flows, news/research, SSI signals). SoDEX powers the demo markets.
- **Data-integrity rule (applies everywhere):** when a live source is unreachable, the app returns
  `null` and says so — it never fabricates a value to fill a gap. This is a deliberate design choice and
  is visible in the code (e.g. sentiment is only labelled when one side is clearly dominant, otherwise
  it stays unlabelled).

---

## 4. What's new in Wave 3

### 4.1 Backtest — historical validation of every signal

The headline Wave 3 addition. Two independent engines, each on its own tab, both **spot-only** and
replayed **day by day on real BTC history**:

- **24 Skills Backtest** — each of the 24 market skills is run as a standalone **long-only** BTC spot
  strategy ("hold BTC unless the skill says SELL"), benchmarked against **Buy & Hold BTC**. A green
  "beat" tag marks the skills that genuinely outperformed simply holding.
- **Strategy Backtest** — all 272 strategies (memecoin family excluded) replayed **long + short** with
  low-risk controls (8-day minimum holding period + trading cost), grouped **by category** so you
  compare like with like. Uses real CMC **OHLCV** (high/low/volume) so candlestick, SMC and volume
  strategies actually trigger. Strategies that never fired show an honest **"no signal in this period"**
  instead of a misleading 0%.

Each row reports **Return, Sharpe, Max Drawdown, Win rate and Exposure**, computed on the strategy's own
compounded equity curve, with no look-ahead (a rule sees data up to day *i* and trades on day *i+1*).

Crucially, the backtest is **honest about its own limits**: a top-of-page note states plainly that *the
true value of a strategy cannot be measured by a backtest*, and a full methodology file (`BACKTEST.md`)
documents the data pipeline, position logic, metric formulas, eight named limitations, and why a single
historical replay can never be a promise of future results. This honesty is itself a feature — it shows
the validation is a sanity check, not a marketing number.

> Full detail: see **`BACKTEST.md`** in the repository.

### 4.2 Skills Signal — a regime-adaptive 24-skill engine

A live signal engine that runs **24 distinct market skills** across the top trading pairs and resolves
each into a **bullish / bearish / neutral** call, scored and explained.

- The skills span trend & momentum, mean-reversion & reversal, volatility, sentiment, breadth &
  rotation, liquidity, a dedicated risk filter (Drawdown Guard) and a regime detector.
- It is **regime-adaptive**: the engine reads real market context — **Fear & Greed** and the real
  **Altcoin Season Index** (via CoinMarketCap public endpoints) — and adapts which skills dominate.
- **No fabrication:** if a context source can't be fetched, the engine returns `null` and falls back
  transparently rather than inventing a Fear & Greed or Altseason number.
- Each skill emits a score and a short human-readable reason, so the output is explainable, not a black
  box — and every one of these 24 skills is exactly what the Backtest tab validates against history.

### 4.3 ETF Flows — SoSoValue institutional-flow layer

A pure **SoSoValue** differentiation layer: US (and Hong Kong) spot-ETF capital flows, the data
SoSoValue is best known for.

- Covers **12 US spot ETFs** (BTC, ETH, SOL, XRP, BNB, DOGE, HYPE, LINK, LTC, AVAX, HBAR, DOT) and
  **3 HK spot ETFs** (BTC, ETH, SOL).
- Pulls two SoSoValue data feeds per asset (via the authenticated SoSoValue API): a **historical inflow
  series** (≈300 days of daily and cumulative net flow) and a **current-metrics summary** (plus
  **per-fund breakdown** — IBIT, FBTC, GBTC, etc. — with AUM).
- Surfaces daily net inflow/outflow, cumulative flow and assets under management, giving traders an
  **institutional-flow read** that no candlestick chart can provide. Rising sustained inflows = quiet
  accumulation; persistent outflows = distribution.

### 4.4 Crypto News + sentiment — SoSoValue research feed

The site's news surface is **powered by SoSoValue**, pulling the latest market news and research, with a
lightweight sentiment layer on top.

- A **weighted, negation-aware** sentiment classifier tags each headline **bullish** or **bearish** —
  but **only when one side is clearly dominant**; mixed or weak headlines are deliberately left
  unlabelled (no forced sentiment).
- Bullish cues include record/all-time highs, breakouts and inflows; bearish cues include dumps,
  delistings, outflows and regulatory charges — each weighted, not a naive keyword match.
- Gives the trader a fast bullish/bearish read on the news tape that sits alongside the price-based
  skills and the flow-based ETF layer.

### 4.5 SSI Signals — index momentum scanner

A dedicated mode inside Active Signals that reads the **live momentum of SoSoValue Indices (SSI)** —
themed token baskets — and resolves each into a single directional bias.

- Three indices: **MAG7.ssi** (mega-cap coins), **DEFI.ssi** (DeFi blue-chips) and **MEME.ssi** (top
  memecoins).
- For each index, **every constituent coin is run through all strategies** on live data to read its
  direction, then weighted together with the **BTC / overall market trend** and the index's **live 24h
  spot move on SoDEX** into one momentum score.
- The result is shown as a clear **five-step bias**: Strong Buy / Bullish / Neutral / Bearish /
  Strong Sell.
- An **All-Time** scan runs every timeframe at once (1D → 4H → 1H → 15M → 5M), stacked section by
  section.
- **Tap any card to drill in** for the per-coin breakdown (which constituents are bullish, bearish or
  neutral), so the score is never a black box, alongside an explainer panel documenting exactly how it
  is built.

This is pure SoSoValue differentiation: the index definitions, constituents and macro events that feed
the momentum engine all come from SoSoValue's index data.

### 4.6 PnL card — shareable result image for every trade

A polish layer on the demo terminal. Every **open and closed** position now has a one-tap button that
opens a **PnL result card** as an image, right inside the app.

- The card shows the **symbol, side and leverage**, **entry → current/exit price**, a large **ROI (ROE)
  %**, the **PnL in dollars**, the **amount opened** (margin), **position size** and the **strategy**
  that drove the trade.
- The theme adapts to the outcome: **green/gold for profit, red for loss**.
- It opens as a **preview first**, then a **Download** button saves it as a PNG.
- Rendered fully client-side on a canvas (no server, no external service), and carries a small
  `straw-pearl.vercel.app` watermark so the app travels with every screenshot.

It turns a paper trade into something a user actually wants to keep and show — a small but real
engagement and distribution hook for the platform.

---

## 5. SoSoValue integration summary

Wave 3 wires SoSoValue into three of its five new surfaces — this is the concrete "SoSoValue-specific
differentiation" the feedback asked for:

| Surface | SoSoValue data used | Endpoint(s) |
|---------|--------------------|-------------|
| **ETF Flows** | Spot-ETF daily & cumulative net flow, AUM, per-fund breakdown | SoSoValue API (key required) |
| **Crypto News** | Latest news & research feed | News / featured feed |
| **SSI Signals** | Index prices, constituents & macro events feeding the momentum engine | SoSoValue Indices (SSI) |

All SoSoValue calls authenticate with a single `SOSOVALUE_API_KEY` (server-side only, never exposed to
the client).

---

## 6. Why this is a complete Wave 3 answer

- **Differentiation:** three SoSoValue-native layers (institutional ETF flows, research-grade news,
  SSI signals) that a generic technical-analysis tool simply does not have.
- **Validation:** a two-engine backtest over real history, with an honest benchmark and a documented,
  limitation-aware methodology.
- **Integrity:** a consistent "never fabricate" rule across every data surface — gaps return `null`, and
  the backtest openly states what it can and cannot prove.
- **Breadth without bloat:** the four Wave 2 surfaces are untouched; Wave 3 adds depth (validation +
  SoSoValue data) rather than more shallow features.

---

## 7. Note on timing

The majority of these updates were made **during the evaluation period after Wave 2 ended**, and we were
told this would not be a problem. Most of the items listed above were changed in **direct response to the
community judges' requests** during the Wave 2 evaluation — acted on the **same day or the next day**.

There is **no incomplete or fake part anywhere in this project**; everything described is real and
functional. The project was **actively built throughout the Wave 2 judging period**, because this was
stated to be a **buildathon**, and the gap between evaluations was **well over three weeks** — so I used
that time to keep building.

---

## 8. What the project is really about

At its core, Strategy DEX is a platform where you can **test strategies and see, at the current live
price, which strategy is firing a long or a short** signal.

The reason there are 270+ strategies is deliberate. **A single strategy does not produce a signal at
all times** — most setups only fire when their specific conditions appear. To solve that, the library is
intentionally large, so that at any given moment some strategy is giving an actionable read. These are
not filler; they are **reliable, battle-tested strategies**.

In the **Active Signals** scanner you can see at a glance **how many strategies are currently firing long
and how many short**. From there, if you want, you can pick whichever signal suits you and open it in
**Demo Trade** to watch whether that signal actually plays out.

Most importantly: these are **not the output of a mock or demo engine — they are real signals**, each
backed by **open-source code in the Strategy Library**. Every signal you see can be traced straight back
to its strategy's source.
