# AI Trade — Command-Driven Market Hunter

AI Trade is a chat terminal built into Strategy DEX. You type a command the way you would message a
person, and the terminal runs the **real engines behind the site** — the full strategy library, the ETF
flow layer, live market data and the demo wallet — and answers in a single readable message.

It is deliberately **not an LLM**. Every reply is produced by a deterministic command engine running the
same open-source strategies you can read in the Strategy Library. No hallucination, no generated
numbers: if a data source is unavailable, it says so instead of inventing a value.

---

## Design principles

- **Real engines, not chat theatre.** `btc` runs all 270+ strategies on real price history — the exact
  same code the Active Signals scanner uses. Trades open in the same demo wallet the Demo Trade page
  uses.
- **One message, readable.** Every command resolves to one compact reply: counts, prices, tallies,
  and a plain-language read.
- **Deterministic and honest.** No model in the middle. Unknown command → it tells you. Missing data →
  it tells you. It never fabricates.
- **Actionable.** Signal scans come with contextual suggestion buttons (e.g. `SOL Long $100 5x`) so a
  read can become a position in one tap.
- **Persistent session.** The conversation survives page navigation (kept until the tab is closed).

---

## Command reference

### 🌍 Market intelligence

| Command | What it does |
|---------|--------------|
| `market` | One-message market overview: the skills engine's **regime** call (with confidence), **Fear & Greed** with an interpretive label, **BTC dominance + Altseason**, BTC 7d/30d performance, market **breadth**, **BTC & ETH ETF net flows** (daily + 7-day), active **risk flags** from the engine, and the regime **playbook bias**. |
| `hunt` | The hunter. Pulls the most active markets of the last 24h, runs **every strategy on each**, computes a net conviction score (long confidence − short confidence) and ranks the **strongest LONG and SHORT setups**, each with its top strategy. One-tap buttons to open the best long/short. |
| `hunt long` / `hunt short` | Directional hunt — only long or only short setups, ranked deeper (top 5). |
| `movers` | Top 5 gainers and top 5 losers of the last 24h with prices. |
| `news` | Latest headlines from the SoSoValue feed, each tagged 🟢 bullish / 🔴 bearish / ⚪ neutral by the weighted, negation-aware sentiment engine, plus an overall news-tone summary. |
| `fg` | Fear & Greed Index: current value, a visual bar, the **7-day trend** (e.g. 52 → 34) and an interpretive label ("extreme fear — historically a contrarian buy zone, but risk is elevated"). |
| `ssi` | SoSoValue Indices (MAG7 / DEFI / MEME) 24h momentum with a directional bias per index. |
| `funding <coin>` | Binance perp funding rate: %/8h and annualized, plus a crowd read — who is paying whom, and whether the crowd is overheated (squeeze risk zones flagged). |

### 📡 Coin analysis

| Command | What it does |
|---------|--------------|
| `btc` (just the ticker) | The full read: runs all strategies (signals tally + top 5 with reasons), then automatically appends **ETF flows** if that asset has a spot ETF. Assets without an ETF (e.g. smaller tokens) get signals only. |
| `<coin> signals` | Strategy scan only: live price, 🟢 LONG / 🔴 SHORT tallies out of all strategies, and the 5 highest-confidence signals with their reasons. |
| `<coin> etf` | ETF flows only: latest daily net inflow/outflow, 7-day net, cumulative, AUM and the fund breakdown (SoSoValue). |
| `<coin> 4h` | Scan on another timeframe: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`. Same engine, different candles — `sol 15m` is the scalper view. |
| `confluence <coin>` | Which **strategy families** agree: every category's long/short vote (🟢 momentum 5L/1S, 🔴 reversal 1L/4S...) plus a family-consensus summary. Far more informative than a single number — you see *which kinds of logic* are aligned. |
| `why <coin>` | The full reasoned read. Combines five evidence layers into one verdict: strategy tally, family consensus, **funding** (crowd positioning), **Fear & Greed** (contrarian context) and **ETF flows** (institutional direction) — each marked 🟢/🔴/⚪, ending with a net LONG/SHORT/mixed conclusion and action buttons. Layers without data (no ETF, no perp) are honestly omitted. |
| `setup <coin>` | An ATR-sized trade plan: engine direction, **stop-loss at 1.5×ATR**, **take-profit at 3×ATR** (1:2 risk/reward) computed from real volatility, and a volatility-adjusted leverage suggestion (choppier coin → lower leverage). One-tap button opens the exact plan with SL/TP attached. |
| `compare <a> <b>` | Head-to-head: both coins through all strategies, side by side, with a 🏆 verdict on which is stronger right now. Also accepts `btc vs eth`. |
| `<coin> price` | Quick live price with detail/long shortcut buttons. |

### 💼 Trading (demo wallet)

All trades use the **same virtual wallet** as the Demo Trade page — a position opened in chat appears
there instantly, and vice versa.

| Command | What it does |
|---------|--------------|
| `btc long 100 5x` | Opens a demo position: $100 margin, 5x leverage, at the live price. Works for every listed market, long and short. |
| `btc long 100 5x sl 2 tp 5` | Same, with a **stop-loss 2% below** and **take-profit 5% above** entry (computed and echoed back as actual prices). |
| `close <coin>` | Closes all open positions in that coin at the live price and reports realized PnL. |
| `closeall` | The panic button: closes **everything** at live prices, reports total realized PnL and the new balance. |
| `positions` | Lists open positions with live PnL and ROE per position. |
| `pnl` | Portfolio summary: total equity and %, unrealized PnL (with open count), realized PnL (with closed count), and your best 🏆 / worst 🩸 open position. |
| `risk` | Portfolio risk check: **exposure ratio** (total notional / equity), **direction concentration** (how much of the book is one-way), **largest single-coin share**, and plain warnings when any of them is stretched ("90% of your book is LONG — one bad candle hits every position at once"). |
| `balance` | Wallet balance and open-position count. |

### 📜 Meta

| Command | What it does |
|---------|--------------|
| `commands` | The full command list, grouped (also: `komutlar`, `help`). |

Quick-access buttons under the chat (📜 Commands · 🎯 Hunt · 📊 Market · 🚀 Movers · 📰 News · 😨 F&G ·
BTC) run the most-used commands in one tap.

---

## What powers each command

| Layer | Source | Used by |
|-------|--------|---------|
| Strategy engine | The site's own 270+ open-source strategies (`run(candles) → Signal`) | `hunt`, `<coin>`, `signals`, `confluence`, `compare`, `why`, `setup`, timeframes |
| Skills engine | The 24-skill regime engine behind Skills Signal | `market` (regime, risk flags, playbook) |
| ETF flows | SoSoValue API | `<coin> etf`, `market`, auto-append on `<coin>` |
| News + sentiment | SoSoValue feed + weighted negation-aware classifier | `news` |
| Fear & Greed | alternative.me public API | `fg`, `market` |
| Funding | Binance public perp API | `funding <coin>` |
| SSI indices | SoDEX spot markets (MAG7ssi / DEFIssi / MEMEssi) | `ssi` |
| Prices & candles | SoDEX klines (all listed markets, 1m–1d) | everything price-related |
| Wallet | The shared demo wallet (`lib/wallet`) | all trading commands |

Every listed market on the site is supported — type any ticker the Market page shows.

---

## A typical hunt

```
you:  hunt
bot:  🎯 Hunt results — 10 markets scanned, all strategies
      🟢 SOL @ 214 — 38L/9S · conviction: +412 · Range Filter
      ...
      [🟢 SOL Long $100 5x] [🔴 XYZ Short $100 5x] [📡 SOL details]

you:  why sol
bot:  🤔 Why SOL — the full read
      🟢 Strategies: 38 long vs 9 short
      🟢 Strategy families: 9 lean long, 2 lean short
      ⚪ Funding: flat — no crowding either way
      🟢 Fear & Greed 32: fear — supports contrarian longs
      🟢 ETF: +$340M net inflow over 7d — institutions accumulating
      🧭 Net read on SOL: the evidence leans LONG.
      [🟢 SOL Long $100 5x] [🛠 Setup SOL]

you:  setup sol
bot:  🛠 SOL trade setup — engine direction + volatility-sized levels
      🟢 LONG @ 214.20 (38L/9S, conviction: +412)
      📏 ATR(14): 3.2% daily volatility
      🛑 SL: 207.35 (3.2% = 1.5×ATR) · 🎯 TP: 234.75 (9.6% = 3×ATR, 1:2 R/R)
      ⚖️ Suggested leverage: 3x
      [⚡ Open this setup ($100)]

you:  risk
bot:  🛡️ Exposure: $300 / $10,120 (0.03x) · ✅ balanced

you:  closeall
bot:  ✅ Closed all 1 position(s). Total realized PnL: +$12.40
```

---

*The demo wallet uses a virtual balance. Signals are educational and research tools; past behaviour is
not a guarantee of future results. Nothing here is financial advice.*
