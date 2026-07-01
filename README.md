# ⚡ Strategy DEX

**A trading strategy lab and demo-trading terminal — explore 220+ battle-tested strategies, scan live markets for active signals, paper-trade with leverage, then trade for real on [SoDEX](https://sodex.com/join/STRATEGY).**

Strategy DEX turns trading strategy research into something you can *see, test and act on*. Browse a huge open-source library of strategies with full source code, find which ones are firing **right now** on any market, practice them risk-free in a realistic demo terminal, and when you're ready — jump straight to the matching market on SoDEX mainnet.

> ⚠️ Educational / demo platform. Nothing here is financial advice. Demo trading uses virtual balance only.

---

## ✨ What's inside

### 📊 Strategy Library — 220+ strategies, 26 categories
A searchable, filterable catalog of trading strategies. Every strategy ships with:
- A plain-language description, entry logic and exit/risk rules
- **Full, copy-paste source code** (TypeScript / Python / Pine where available)
- A one-click **"Run in Demo"** shortcut

Strategies span Smart Money Concepts, classic indicators, candlestick & chart patterns, oscillators, volume, volatility, moving averages, harmonic patterns, momentum, statistical models, advanced SMC, multi-signal hybrids, price action, popular TradingView favorites (TTM Squeeze, WaveTrend, UT Bot, SSL, QQE, HalfTrend, Hull Suite…), crypto bot strategies (Grid, DCA, Martingale…) and more.

### 🔭 Active Signals — real-time signal scanner
Run **all 281 strategies across 32 categories** at once against live market data and instantly see which ones are firing a LONG or SHORT signal. Features:

- **Scan a single market or sweep the top markets** in one click: every one of the 281 strategies is evaluated on the same live candles, so nothing is cherry-picked
- **Full-spectrum coverage**: trend, momentum, mean-reversion, breakout, volatility, volume and market-structure strategies all read the market side by side
- Results **ranked by confidence**, each with entry / stop / R:R and a plain-language reason for why it fired
- **Confluence view**: see how many strategies agree on a direction per market ("8 LONG vs 2 SHORT, strong LONG"), turning dozens of independent reads into one clear bias
- **One-click jump to Demo** for any signal, pre-loaded with that market so you can paper-trade it right away

### 🧭 SSI Signals — index momentum scanner
A dedicated mode inside Active Signals that reads the live momentum of **SoSoValue Indices (SSI)** — themed baskets of tokens:
- Three indices: **MAG7.ssi** (mega-cap coins), **DEFI.ssi** (DeFi blue-chips) and **MEME.ssi** (top memecoins)
- For each index, **every constituent coin is run through all strategies** on live data to read its direction, then weighted together with **BTC / overall market trend** and the index's **live 24h spot move on SoDEX** into a single momentum score
- Result shown as a clear five-step bias: **🚀 Strong Buy · 📈 Bullish · ➖ Neutral · 📉 Bearish · 🔻 Strong Sell**
- **All Time** scan runs every timeframe at once (1D → 4H → 1H → 15M → 5M), stacked section by section
- **Tap any card to drill in** — see the per-coin breakdown (which constituents are bullish, bearish or neutral), so the momentum is never a black box
- A detailed explainer panel documents exactly how the score is built

### 🦅 Skills Signal

A regime-adaptive strategy engine that reads the market's posture and turns it into clear, explainable calls **for BTC and ETH only**. Every skill is a pure, independently-runnable function returning a **BUY / SELL / NEUTRAL** verdict with a plain-language reason.

- A market-wide layer first classifies the tape into one of **five regimes** (Alt Risk-On, BTC Risk-On, Chop, Risk-Off, Capitulation), which sets the posture and decides which signals to trust
- Then **24 independent skills** each score BTC and ETH and cast a verdict, composed into one net read of the market with every skill's reasoning shown transparently

**The 24 skills:**

1. **Momentum** : Rides positive trend confirmed by MACD and a healthy RSI.
2. **Trend Alignment** : Checks whether 24h, 7d, 30d and 90d all point the same way.
3. **Mean Reversion** : Buys oversold, trims overbought; best in range-bound markets.
4. **Momentum Cross** : Short-term momentum crossing above long-term is bullish, below is bearish.
5. **Volume / Turnover** : Heavy turnover into a rising price is accumulation; into a fall, distribution.
6. **Dip Buyer** : Hunts assets well off their highs that are starting to stabilize.
7. **Volatility Breakout** : Flags an outsized move vs the recent pace as a likely breakout.
8. **Regime Detection** : Classifies the market into five regimes and sets posture.
9. **Fear & Greed Contrarian** : Buys extreme fear, sells extreme greed.
10. **Sentiment Divergence** : Flags when crowd sentiment disagrees with market internals.
11. **Breadth Rotation** : Broad participation backs risk-on; a narrowing tape flags fragility.
12. **Dominance Rotation** : Rising dominance favors BTC over ETH; falling dominance favors ETH.
13. **ETH / BTC Relative Strength** : Measures which of the two is the stronger horse right now.
14. **Dry Powder** : Lots of sidelined capital during fear is a bullish setup.
15. **Altcoin Season Gate** : Decides whether ETH should be favored over BTC.
16. **Momentum Acceleration** : Is the trend speeding up or fading? Catches acceleration early.
17. **Trend Quality** : Rewards clean, consistent trends over choppy ones.
18. **Capitulation / Euphoria Reversal** : Hunts turning points at sentiment extremes.
19. **Flight to Majors** : Reads when capital concentrates defensively into BTC and ETH.
20. **Volume-Confirmed Trend** : A trend only counts if volume backs it.
21. **Liquidity Health** : Checks whether turnover is healthy enough to trust the move.
22. **Drawdown Guard** : Deep, still-bleeding drawdowns flag risk-off, step aside.
23. **Capitulation Volume** : A violent flush in fear is accumulation; a vertical pump in greed is a blow-off.
24. **Momentum Divergence** : Catches early turns when the 24h move disagrees with the weekly trend.

Each verdict is independent, explainable, and updates live, no black boxes.

### 🔬 Backtest — historical validation on real BTC history
Two independent engines, both **spot-only**, replayed **day by day on real Bitcoin history**:
- **24 Skills Backtest** : each skill run as a **long-only** BTC strategy ("hold BTC unless it says SELL"), benchmarked against **Buy & Hold BTC** — a green **beat** tag marks the skills that genuinely outperformed simply holding
- **Strategy Backtest** : all **272 strategies** replayed **long + short** with low-risk controls (8-day minimum hold + trading cost), **grouped by category**, on real CMC **OHLCV** so candlestick, SMC and volume strategies actually trigger
- Every row reports **Return · Sharpe · Max Drawdown · Win rate · Exposure** on the strategy's own compounded equity curve, with **no look-ahead** (sees data up to day *i*, trades on day *i+1*)
- Strategies that never fired show an honest **"no signal in this period"** instead of a misleading 0%
- **Honest by design** : a top-of-page note states plainly that the true value of a strategy cannot be measured by a backtest — full methodology, metric formulas and limitations are documented in **[BACKTEST.md](./BACKTEST.md)**

### 📈 Market — live prices, all in one place
A categorized market overview with live prices and 24h change:
- **Crypto · Stocks · Commodities · Indices** tabs
- A dedicated **SSI** tab for SoSoValue Index spot markets (MAG7ssi, DEFIssi, MEMEssi), each linking straight to Active Signals
- Search, auto-refresh, and per-asset shortcuts to **Signals** and **Demo**

### 📰 News — crypto news, curated
A multi-tab crypto news terminal powered by the **SoSoValue News API**:
- **Hot · Feed · News · Research · Macro** tabs, each pulling from the live SoSoValue feed
- Every item tagged with the coins / assets it mentions
- Fully localized across all 10 languages

### 💹 ETF Flows — institutional money, visualized
Track how money is moving through **spot crypto ETFs**, powered by **SoSoValue** data:
- Daily **net inflow / outflow** and **cumulative flow** across BTC, ETH, SOL and more — both **US and Hong Kong** ETFs
- **Flow bias & streak** — is smart money accumulating or distributing, and for how many consecutive days
- A **flow heatmap** for the recent daily picture at a glance
- **Flow Momentum Oscillator** — an RSI-style reading on the flow series that flags overheated (🔥) or oversold (❄️) inflow conditions
- Clean, abbreviated charts (e.g. $18.00B, $418.3M, -$600.0M) with crosshair detail

### 🎮 Demo Trade — realistic paper-trading terminal
A full leverage-trading simulator with a **virtual balance** — practice any strategy with zero risk:
- Live candlestick chart with entry / stop-loss / take-profit / liquidation overlays
- Adjustable leverage (1x–25x), margin-based position sizing
- **Partial take-profit + breakeven trailing** — at TP1 half the position closes and the stop trails to breakeven
- Liquidation engine, ROE/PnL tracking, equity curve, full trade history and live log
- Auto-trade toggle to let a chosen strategy trade for you
- **📸 PnL card** — every open and closed position has a one-tap card that opens a shareable result image (symbol, side, leverage, entry → current/exit, big ROI %, PnL $, opened amount and strategy), with a **profit (green) / loss (red) theme** and a **Download** button to save it as a PNG
- **⚡ Mainnet Trade** button — opens the exact same market on **SoDEX** to trade for real

### 🧪 Playground — write your own strategy
A built-in code editor where you can write a strategy in JavaScript and run it instantly:
- Runs in an **isolated Web Worker sandbox** — no network, no DOM, nothing leaves your browser
- Helper library included (EMA, SMA, RSI, MACD, ATR, Bollinger Bands…)
- Test it live against real market data, then paper-trade the result

### ⚡ SoDEX Mainnet Integration
Strategy DEX is built as an on-ramp to **[SoDEX](https://sodex.com/join/STRATEGY)** — the on-chain order-book DEX. Markets listed on SoDEX (crypto, commodities, real-world assets and indices) appear right inside the app, and every chart links to its live SoDEX market so you can go from *idea → signal → practice → real trade* without leaving the flow.

### 🔗 SoSoValue Data Integration
Beyond raw prices, Strategy DEX taps **[SoSoValue](https://sosovalue.com)** open APIs for institutional-grade market data:
- **Spot ETF flows** (US & HK) — net/cumulative inflows powering the ETF Flows page
- **Crypto news & research** feeding the News terminal
- **SoSoValue Indices (SSI)** — index prices, constituents and macro events that drive the SSI momentum engine

All of it is proxied through lightweight server routes (keeping the API key server-side) and surfaced natively inside the app.

### 🌍 Multi-language
Available in 10 languages: English, Turkish, Spanish, French, German, Russian, Chinese, Japanese, Korean and Portuguese.

---

## 🗂️ Strategy categories

| | | |
|---|---|---|
| SMC / Price Action | Classic Indicators | Memecoin |
| Scalping | Mean Reversion | Trend Following |
| Breakout | Candlestick Patterns | Oscillators |
| Volume | Volatility | Moving Averages |
| Harmonic Patterns | Chart Patterns | Candlestick II |
| Momentum | Bands & Channels | Pivot Points |
| Trend Strength | Reversal Patterns | Statistical |
| Advanced SMC | Hybrid / Multi-Signal | Price Action |
| Popular (TradingView) | Bot Strategies | |

---

## 🧠 The flow

```
 Library / Market  →  Active Signals  →  Demo Trade  →  SoDEX Mainnet
   discover a          see what's         practice it      trade it
   strategy / asset    firing now         risk-free        for real
```

---

## 🔒 Privacy & isolation

Strategy DEX is **fully client-side**. Your demo wallet, positions and trade history live only in your own browser (local storage) — nothing is stored on a server, and **no user can ever see another user's trades**. Each session is completely isolated. The only shared data is public market price data.

---

## 🛠️ Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **lightweight-charts** for candlestick rendering
- **Web Worker** sandbox for safe user-code execution
- Server-side API routes proxying **SoSoValue** & **SoDEX** live market data (keeps API keys server-side)
- Local-storage-backed virtual wallet — no backend, no database
- Zero-config deploy on **Vercel**

---

## ⚠️ Disclaimer

Strategy DEX is an **educational and demonstration tool**. All in-app trading is **paper trading with a virtual balance**. The strategies, signals and backtested ideas are provided for learning purposes only and are **not financial advice**. Trading leveraged products carries significant risk. Always do your own research.

---

*Built for traders who want to learn, test, and trade smarter.*
