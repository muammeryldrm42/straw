# Backtest Methodology — Strategy DEX

> **Important note — the true value of a strategy or skill cannot be measured by a backtest.**
> A backtest is a historical simulation, not a verdict. It shows how a rule *would* have behaved on one
> asset, on one timeframe, over one specific slice of the past. The genuine worth of a strategy lies in
> how it informs a trader's decisions, how it stacks with other signals, how risk is sized around it,
> and how it adapts to regimes that have not happened yet — none of which a single historical replay can
> capture. **Read every number here as context and a sanity check, never as proof.** Strong history does
> not guarantee future results, and a weak history does not make a strategy worthless in practice. The
> backtest exists to filter out what is clearly broken, to reveal *behaviour*, and to form hypotheses —
> not to rank rules by a single number.

---

## Table of contents

1. [Overview](#1-overview)
2. [Data sources & pipeline](#2-data-sources--pipeline)
3. [The 24 Skills backtest](#3-the-24-skills-backtest)
4. [The Strategy backtest](#4-the-strategy-backtest)
5. [Metrics in depth](#5-metrics-in-depth)
6. [The benchmark](#6-the-benchmark)
7. [Position & accounting rules](#7-position--accounting-rules)
8. [Limitations](#8-limitations)
9. [Why a backtest can't measure real value](#9-why-a-backtest-cant-measure-real-value)
10. [How to read each tab](#10-how-to-read-each-tab)
11. [Reproducing the results](#11-reproducing-the-results)

---

## 1. Overview

The Backtest page contains **two independent engines**, each on its own tab. They are deliberately
different because skills and strategies are different kinds of object.

| Tab | Object under test | Count | Direction | Benchmark | Source |
|-----|-------------------|-------|-----------|-----------|--------|
| **24 Skills Backtest** | The market skills that drive the Skills Signal engine | 24 | Long-only spot | Buy & Hold BTC | Live, recomputed each run |
| **Strategy Backtest** | The full strategy library (memecoin family excluded), grouped by category | 272 | Long + Short | — | Live, recomputed each run |

Both engines are **spot only** — no leverage, no liquidation, no funding, no perpetuals. Each rule is
replayed **day by day** over real Bitcoin history, and an equity curve is compounded from its daily
returns.

The two tabs answer two different questions:

- **Skills tab:** *"As a single long-only filter on BTC, does this skill add anything over just holding
  Bitcoin?"*
- **Strategy tab:** *"Replayed both long and short with low-risk controls, how does each strategy behave
  within its own family?"*

---

## 2. Data sources & pipeline

All data is pulled **live and server-side** from CoinMarketCap's public API. When no API key is set the
**keyless trial tier** is used automatically; with a key, the standard endpoints are used. Nothing is
hard-coded or cached into the repository — figures move as new days are added.

**Series fetched:**

- **OHLCV (daily):** open / high / low / close / volume for **BTC**, plus **ETH** (used by
  relative-strength and rotation skills).
- **Fear & Greed Index (daily history):** the sentiment series.
- **BTC Dominance (daily history):** from the global-metrics endpoint.

**Derived per-day inputs.** Some signals need data that has **no clean daily history** through the
public API. Rather than leaving those skills idle, the engine **derives** a plausible daily value from
what is available:

| Derived input | How it is approximated | Used by |
|---------------|------------------------|---------|
| Top-100 **breadth** | From BTC/ETH 24h & 7d momentum (advancers proxy) | Breadth Rotation, Sentiment Divergence |
| **Stablecoin share** | Inverse of Fear & Greed (fear → more sidelined cash) | Dry Powder |
| **Altcoin Season** | ETH-vs-BTC 7d relative strength, scaled | Altseason Gate, Regime Detection |
| **Turnover** | Real 24h volume / (price × circulating supply) | Volume / Turnover, Liquidity Health, Capitulation, Volume-Confirmed Trend |
| **Total / ETH market cap** | Price × approximate circulating supply, scaled by dominance | Dry Powder, rotation skills |

> These derived values are **approximations**, not exact historical readings. Skills that depend on
> them are **indicative**, and this is stated on the page.

**Fallback.** If the live feed is unreachable the engine switches to a **synthetic price series** and
labels the result \`synthetic series (logic proof)\`. In that mode the numbers only prove the logic runs;
they are **not** real performance. When real data is used, the header reads \`real CMC history\`.

---

## 3. The 24 Skills backtest

### 3.1 Framing

Each skill is treated as a **standalone long-only BTC spot strategy**. Every day the skill is evaluated
against that day's full context and emits **BUY / SELL / NEUTRAL** for BTC. The position rule is:

> **Hold spot BTC unless the skill actively says SELL** (then sit in cash).
> \`BUY\` or \`NEUTRAL\` -> hold BTC and earn the next day's return. \`SELL\` -> cash, earn nothing.

This "stay invested unless told to step aside" framing is deliberate: several skills are **risk
filters** — they rarely shout *buy*, their job is to tell you when to **get out**. Under a naive
"only hold on an explicit BUY" rule those skills would never take a position and would look empty.

### 3.2 The skills and what each one reads

**Trend & momentum**
- **Momentum (RSI · MACD · Fear & Greed)** — composite momentum: oscillator state plus sentiment.
- **Trend Alignment (multi-timeframe)** — agreement of 7d / 30d / 90d direction.
- **Momentum Cross (7d vs 30d)** — short-term momentum crossing the medium-term.
- **Momentum Acceleration** — the *change* in momentum (second-derivative), catching early shifts.
- **Trend Quality** — how clean / persistent the trend is, not just its direction.
- **Volume-Confirmed Trend** — a trend only counts if turnover backs it; thin-volume moves are downgraded.
- **Momentum Divergence** — price making highs/lows that momentum does not confirm.

**Mean reversion & reversal**
- **Mean Reversion (RSI extremes)** — fades stretched RSI readings.
- **Dip Buyer (drawdown recovery)** — buys controlled pullbacks that start to recover.
- **Reversal Radar** — combines sentiment and price to flag turning points.
- **Capitulation Volume** — a violent flush on heavy turnover in extreme fear (accumulate) or a vertical
  pump on huge volume in extreme greed (distribute).

**Volatility**
- **Volatility Breakout** — expansion out of compression.

**Sentiment**
- **Fear & Greed Contrarian** — leans against sentiment extremes.
- **Sentiment Divergence** — sentiment disagreeing with market internals (euphoria on weak breadth,
  fear on strong breadth).

**Breadth, dominance & rotation**
- **Breadth Rotation** — broad participation backs risk-on; a narrowing tape flags fragility.
- **Dominance Rotation (BTC <-> ETH)** — rising BTC dominance favours BTC, falling favours ETH.
- **ETH / BTC Relative Strength** — which major is leading.
- **Altcoin Season Gate** — uses the Altcoin Season reading to favour ETH or BTC.
- **Flight to Majors** — risk-off rotation into the largest caps.

**Liquidity & capital**
- **Volume / Turnover** — heavy turnover into strength = accumulation; into weakness = distribution.
- **Dry Powder (stablecoin supply)** — sidelined cash during fear is fuel for upside.
- **Liquidity Health** — is turnover healthy enough to trust the move?

**Risk filter**
- **Drawdown Guard** — deep, ongoing 30d/90d drawdowns that are still bleeding -> step aside.

**Regime**
- **Regime Detection (derivatives-aware)** — combines dominance, altseason and trend into a regime call.

### 3.3 Notes on the skills tab
- Benchmarked against **Buy & Hold BTC**; the green **"beat"** tag marks skills that outperformed simply
  holding.
- Rotation/dominance/altseason skills lean on **derived** inputs (see §2) and are indicative.
- A handful of skills are designed to favour ETH over BTC; on a **BTC-only** spot test they will often
  sit closer to neutral by construction.

---

## 4. The Strategy backtest

### 4.1 Framing

Each strategy reads the candle history and emits **long / short / neutral**:

- \`long\` -> position **+1** (profits if BTC rises)
- \`short\` -> position **-1** (profits if BTC falls)
- \`neutral\` -> **keep** the current position (no forced exit)

Two **low-risk controls** are applied so the test reflects calm, deliberate trading rather than churn:

- **Minimum holding period (8 days):** once a position is opened it is locked for at least 8 days before
  it can flip — this removes day-to-day whipsaw and cuts cost.
- **Trading cost (~6 bps):** charged on every position change.

A warm-up window of ~150 bars is skipped so indicators are fully formed before the first trade.

### 4.2 Why real OHLCV matters here

Many strategies need **high / low / volume**, not just the closing price — Donchian channels, Keltner
squeezes, VWAP, candlestick patterns, and Smart-Money-Concept blocks (FVG, order blocks, supply/demand)
are defined by intraday range and turnover. The engine therefore uses **real CMC OHLCV**. Strategies
that produced no trade at all over the window are shown as **"no signal in this period"** rather than a
misleading \`0%\` — this is normal for **rare formations** (see §4.4).

### 4.3 Categories

Strategies are grouped by category so you compare **like with like**. Each block is one family and lists
every member with its metrics, sorted by return. The library spans roughly **30 categories**, including:

| Category | Theme | Approx. count |
|----------|-------|---------------|
| Popular | The most widely used setups | 14 |
| Reversal | Turning-point formations | 12 |
| Price Action | Pure price behaviour, no indicators | 12 |
| Momentum | Momentum oscillators & thrust | 12 |
| Indicators | Classic technical indicators | 12 |
| Hybrid | Multi-signal confluence | 12 |
| Classics | Time-tested textbook systems | 12 |
| Bands | Band/envelope systems (Bollinger, Keltner, STARC) | 12 |
| Advanced SMC | Advanced Smart Money Concepts | 12 |
| Trend Strength | ADX-style trend-strength filters | 10 |
| Statistical | Z-score / statistical mean reversion | 10 |
| SMC | Smart Money Concepts (liquidity, BOS, FVG) | 10 |
| Ichimoku | Ichimoku-cloud based | 10 |
| Fibonacci | Fibonacci retracement / extension | 10 |
| Divergence | Price-vs-oscillator divergence | 10 |
| Bot Strategies | Automation-oriented rule sets | 10 |
| Wyckoff | Wyckoff accumulation/distribution phases | 8 |
| VWAP | VWAP-anchored setups | 8 |
| Volume | Volume-driven signals | 8 |
| Pivots | Floor / DeMark / R-S pivot logic | 8 |
| Oscillators | Oscillator crossovers & extremes | 8 |
| Moving Averages | MA crosses & ribbons | 8 |
| Chart Patterns | Classic chart formations | 8 |
| Volatility | Volatility expansion/contraction (VCP) | 6 |
| Harmonic | Harmonic patterns (Gartley, Butterfly, Cypher) | 6 |
| Trend | Trend-following | 4 |
| Patterns | Candle/structure patterns | 4 |
| Breakout | Range/channel breakouts | 4 |
| Scalping | Fast, short-horizon setups | 3 |
| Mean Reversion | Reversion-to-mean systems | 3 |

*(The memecoin family is intentionally excluded from the backtest.)*

### 4.4 "No signal in this period" — what it means

Some formations are **genuinely rare**. An Abandoned Baby, a Gartley/Butterfly harmonic, or a specific
SMC block may simply **not occur** in the tested window. When a strategy never fired, its row reads
**"no signal in this period"**, shown greyed-out at the bottom of its category. This is an honest
statement that the setup didn't appear — **not** a sign the strategy is broken or mis-coded. It is
expected behaviour for low-frequency, high-specificity rules.

---

## 5. Metrics in depth

| Metric | Plain meaning | How it's computed |
|--------|---------------|-------------------|
| **Return** | What your balance would have done | Real ordered compounding of daily returns: product of (1 + rt) - 1 |
| **vs B&H** (skills only) | Outperformance vs holding BTC; "beat" if positive | skillReturn - holdReturn |
| **Sharpe** | Reward per unit of risk, annualised | mean(r) / stdev(r) × sqrt(365), over **active** (in-position) days |
| **Max DD** | Worst peak-to-trough fall of the equity curve | min(equity / running_peak - 1) |
| **Win** | Share of in-position days that were green | positive days / active days |
| **Exposure** | How many days a position was actually held | count of non-zero-return days |

**Reading them together (this is important):**
- **Return alone is misleading.** Two rules with the same return can have very different risk. Always
  pair it with **Max DD** (how painful the ride was) and **Sharpe** (was the return earned cleanly or by
  taking wild risk).
- **High exposure + low Sharpe** = a rule that's always in the market but not adding skill.
- **Low exposure + high return** = a selective rule; check it isn't just one lucky stretch.
- **Win rate** can be high while return is negative (many small wins, few large losses) and vice-versa —
  never judge on win rate alone.

---

## 6. The benchmark

On the **Skills tab**, **Buy & Hold BTC** is the reference line: what you'd earn by buying BTC at the
start and doing nothing. A skill only proves its worth if it **beats** this line; below it, untouched
holding would have been better. In a strong uptrend, **most active rules trail buy & hold** — so the
ones that beat it are the genuinely value-adding signals, and the green **"beat"** tag marks them.
The fact that many skills *don't* beat holding is itself a sign of an honest backtest, not a weakness.

The **Strategy tab** has **no buy & hold line** on purpose: those strategies run **long and short** and
are meant to be read **within their category**, not against a passive long-only hold.

---

## 7. Position & accounting rules

- **No look-ahead:** on day *i* a rule only sees data **up to and including day *i***; the resulting
  position earns the return **from day *i* to *i+1***. Decisions never use future bars.
- **Warm-up:** the first ~120-150 bars are skipped so indicators are fully formed.
- **Costs:** a flat ~6 bps is charged on every position change (skills change less often; strategies are
  additionally locked by the 8-day minimum hold).
- **Cash = flat:** when a rule is out of the market, that day's return is exactly zero (no interest, no
  shorting the cash).
- **Equity curve:** returns are compounded in their true chronological order — the "Return" column is a
  real equity outcome, not a re-sampled average.

---

## 8. Limitations

1. **In-sample.** One historical replay, not walk-forward or out-of-sample validation. Rules can look
   good on the very past that shaped them.
2. **Daily granularity.** Signals act on daily closes; intraday highs/lows, gaps and execution timing
   within a day are not modelled.
3. **Idealised execution.** A flat cost is applied, but slippage, partial fills, order-book depth and
   liquidity are not simulated — real fills are worse, especially for fast/scalping rules.
4. **Single asset.** Everything is BTC (skills also read ETH for relative strength). Behaviour on
   thinner altcoins will differ.
5. **Derived market-state.** Breadth, stablecoin share, altseason and turnover are approximated from
   available data, not exact historical series; dependent skills are indicative only.
6. **Regime dependence.** Results are dominated by whatever BTC did in the window. A different window can
   reorder the rankings entirely.
7. **Isolation.** Each rule is tested alone at full size; real trading blends signals, sizes risk and
   applies discretion.
8. **Rare-event coverage.** Low-frequency patterns may not occur in the window ("no signal") — absence
   of a trade is not the same as a bad strategy.

---

## 9. Why a backtest can't measure real value

- **A strategy is a decision aid, not an autonomous money machine.** Its value is realised through the
  person or system using it — entries, exits, sizing, and the *other* evidence weighed alongside it.
- **Overfitting is invisible in-sample.** A rule tuned (even unconsciously) to the past can show great
  history and fail forward.
- **One number hides the distribution.** Same return, completely different risk, path and tolerability.
- **Markets are non-stationary.** An edge in one regime can vanish or invert in the next; the future is
  not a re-sample of the past.
- **Combination effects.** Many of these skills are designed to be **stacked** — a regime layer, a
  per-coin scorer, a risk veto. Tested alone, each looks weaker than the ensemble it belongs to.
- **What a backtest is genuinely good for:** ruling out the clearly broken, exposing *behaviour* (risk,
  drawdown, exposure, regime sensitivity), and generating hypotheses to test forward — never a promise.

---

## 10. How to read each tab

**Skills tab**
1. Look at the **Buy & Hold** line first — that's the bar to clear.
2. Scan the **"beat"** tags: those skills added value over holding in this window.
3. For each skill weigh **Return + Max DD + Sharpe together**, not return alone.
4. Remember rotation/altseason skills are indicative on a BTC-only test.

**Strategy tab**
1. Read **inside a category** — compare scalping with scalping, SMC with SMC.
2. Within a family, the top rows are the better-behaved members for this window.
3. **"no signal in this period"** = the formation didn't occur; ignore, don't penalise.
4. Cross-check **Max DD** and **Sharpe** before trusting a big Return.

---

## 11. Reproducing the results

| What | Endpoint | Engine |
|------|----------|--------|
| Skills | \`GET /api/skill-backtest?days=1460\` | \`lib/skillBacktest.ts\` |
| Strategies | \`GET /api/strategy-backtest?days=1460\` | \`lib/strategyBacktest.ts\` |
| Force synthetic (logic check) | append \`?synthetic=1\` | both |

Results are recomputed **live** from CoinMarketCap history on each run, so exact figures evolve as new
days are added and the market changes. The \`days\` parameter controls the lookback window
(clamped to a sensible range).

---

*Spot only. No leverage, no liquidations. Past performance is not a guarantee of future results.
Nothing here is financial advice.*
