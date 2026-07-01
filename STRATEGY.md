# Strategy Engine — How the 270+ Strategies Work

> **This document does not list the strategies one by one.** With 270+ of them, a flat list would be
> noise. Instead it explains **how the strategy engine works**: the shared contract every strategy
> obeys, how raw candles become a long/short/neutral signal, why there are so many strategies, and what
> each of the ~30 categories is actually doing. Once you understand the system, every individual
> strategy is just one more rule plugged into it.

---

## 1. The shared contract

Every strategy in the library — all 270+ of them, across 31 categories — implements the **exact same
function shape**:

```
run(candles) -> Signal
```

where a `Signal` is always:

```ts
{
  signal: "long" | "short" | "neutral",
  entry: number,
  stop_loss: number,
  take_profit: number[],
  confidence: number,   // 0-100, how strong the setup is
  reason: string        // human-readable explanation of why
}
```

This single contract is the backbone of the whole product. Because every strategy speaks the same
language, the engine can:

- **run all of them uniformly** on live data (Active Signals),
- **scan them in parallel** across many symbols and timeframes,
- **backtest them with one loop** (Backtest),
- and let you **drop any of them into Demo Trade**, or write your own to the same shape in the
  Playground.

No strategy is a special case. Add a new rule that returns a `Signal`, and the entire platform —
scanner, backtest, demo, library — picks it up automatically.

---

## 2. How a signal is born

Every strategy follows the same four-step pipeline, regardless of how simple or complex its logic is:

1. **Candles in** — an OHLCV array (open, high, low, close, volume) for the chosen symbol and timeframe.
2. **Indicators computed** — the strategy calls whatever it needs from the shared indicator toolkit.
3. **Logic evaluated** — the rule looks at the current state (and recent history) and decides a
   direction.
4. **Signal out** — it returns the `Signal` object: direction, entry, stop, targets, a confidence
   score, and a plain-language reason.

The **`reason`** field matters: it means no signal is a black box. Every long or short the platform
shows comes with a one-line explanation of *why* the rule fired.

---

## 3. The indicator toolkit

Strategies don't each reinvent the math. They share a common set of building blocks, so the same RSI or
ATR is computed the same way everywhere:

- **EMA / SMA** — exponential and simple moving averages (trend, crosses, ribbons).
- **RSI** — relative strength index (momentum, overbought/oversold).
- **MACD** — moving-average convergence/divergence (momentum and trend shifts).
- **ATR** — average true range (volatility, used for stops and position context).
- **Bollinger Bands** — volatility envelopes around a moving average.
- **VWAP** — volume-weighted average price (intraday fair value).
- **Swing highs / swing lows** — pivot detection that powers structure, patterns, SMC and Fibonacci.

A strategy combines these (or reads price/structure directly) and turns the result into a direction.

---

## 4. Direction, confidence and "neutral"

A strategy resolves to one of three states:

- **long** — conditions favour upside; profit if price rises.
- **short** — conditions favour downside; profit if price falls.
- **neutral** — the setup is **not present**. The rule deliberately stands aside instead of forcing a
  trade.

`neutral` is a feature, not a gap. Most setups only exist under specific conditions; a good strategy
says nothing when its pattern isn't there. The **confidence** score (0-100) then grades how clean the
setup is, so a weak, barely-qualifying signal can be told apart from a textbook one.

---

## 5. Why there are 270+ strategies

This is the most common question, so it deserves a direct answer.

**A single strategy does not fire all the time.** Each rule is built for a specific market condition —
a trending market, a ranging market, a volatility squeeze, a capitulation flush, a precise candle
formation. When that condition isn't present, the strategy correctly returns `neutral`.

If the library had only a handful of strategies, then most of the time **nothing** would be firing. The
large, diversified library solves exactly this: across 270+ rules spanning ~30 logical families, at any
given moment **some** of them match the current market and produce an actionable read. Breadth is not
padding — it is what keeps the scanner useful in every regime. And they are not random: each is a
recognised, established trading method.

---

## 6. The 31 categories

The strategies are organised into 31 thematic families. Below is what each family is actually doing —
the logic behind it, not a list of its members.

**Popular** — The most widely used, first-reach setups: RSI overbought/oversold, MACD crosses,
moving-average crosses, Bollinger touches. The bread-and-butter signals most traders know.

**Reversal** — Catch turning points: exhaustion, failed breakouts, momentum that stalls and flips.
They look for the moment a move runs out of fuel and prepares to reverse.

**Price Action** — Pure price, no indicators: pin bars, inside bars, engulfing candles, breaks of
structure read straight from the raw candles.

**Momentum** — Ride strength: rate-of-change, RSI thrust and momentum oscillators that confirm a move
has real force behind it rather than drifting.

**Indicators** — The classic technical toolbox turned into clean rules: MACD, Stochastic, CCI,
Williams %R and similar, each expressed as a straightforward long/short trigger.

**Hybrid** — Confluence systems: combine two or more independent signals (e.g. trend + momentum +
volume) and only fire when they agree, filtering out weaker single-signal noise.

**Classics** — Time-tested textbook systems traded for decades: Turtle-style breakouts, golden/death
crosses, channel systems. Simple, robust, well understood.

**Bands** — Envelope systems: Bollinger, Keltner, STARC, Donchian. Trade the band edges, the squeeze,
or the break out of the band.

**Advanced SMC** — Deeper Smart Money Concepts: fair-value-gap inversion, mitigation blocks, breaker
blocks, liquidity voids — institutional-footprint reading beyond the basics.

**Trend Strength** — Measure how strong a trend is before trusting it: ADX-style filters that separate
genuine trends from directionless chop.

**Statistical** — Quant-flavoured: z-scores, standard-deviation bands, statistical mean reversion —
"how far is price from its statistical normal, and is that extreme?"

**SMC** — Core Smart Money Concepts: break of structure, order blocks, fair value gaps and liquidity
sweeps — the foundation of the modern price-structure approach.

**Ichimoku** — The Ichimoku cloud system: price relative to the cloud, conversion/base-line crosses,
and lagging-span confirmation, all in one framework.

**Fibonacci** — Retracement and extension levels: entries at golden-ratio pullbacks, targets projected
at Fibonacci extensions.

**Divergence** — Price and an oscillator disagreeing: price prints a new high but momentum doesn't —
an early warning that the move is tiring.

**Bot Strategies** — Automation-oriented rule sets designed to run mechanically: clear, unambiguous
entry/exit logic with no discretionary judgement required.

**Wyckoff** — Accumulation and distribution phases: springs, upthrusts, signs of strength and weakness
— reading what large operators are doing beneath the surface.

**VWAP** — Volume-weighted average price as a fair-value anchor: trade reversion back to it, or
decisive breaks away from it on volume.

**Volume** — Volume-driven signals: accumulation/distribution, volume spikes and on-balance volume
confirming or contradicting a price move.

**Pivots** — Floor pivots, DeMark and R/S levels: pre-computed support and resistance that the next
session tends to react to.

**Oscillators** — Bounded oscillators (Stochastic, RSI, CCI): crossovers and extreme readings used as
entry and exit triggers.

**Moving Averages** — MA crosses, ribbons and slope: the simplest and most durable trend-following
family.

**Chart Patterns** — Classic formations detected from swing structure: head & shoulders, triangles,
flags, double tops and bottoms.

**Volatility** — Volatility expansion and contraction: VCP (volatility-contraction pattern) and
squeeze-then-expand setups that anticipate a big move.

**Harmonic** — Harmonic patterns: Gartley, Butterfly, Cypher and similar precise Fibonacci-ratio
geometries — rare, but high-conviction when they appear.

**Trend** — Straightforward trend-following: align with the dominant direction and stay with it until
it clearly changes.

**Patterns** — Candle and multi-bar structure patterns not covered by the other families.

**Breakout** — Range and channel breakouts: enter as price escapes a consolidation with force.

**Scalping** — Fast, short-horizon setups built for quick in-and-out moves, typically on lower
timeframes.

**Mean Reversion** — The core "price returns to its average" idea: fade overstretched moves back toward
the mean.

**Memecoin** — Meme-token-specific heuristics tuned to that market's extreme volatility and momentum.
This family is excluded from the standard backtest by design.

---

## 7. Where the strategies are used

The same `run(candles) -> Signal` contract powers four different surfaces:

- **Active Signals** — every strategy runs on live data; the scanner lists the ones currently firing
  and how many are long vs short.
- **Demo Trade** — pick any single strategy (now with a searchable picker) and trade or auto-trade it
  on a virtual balance.
- **Backtest** — the same strategies are replayed on real BTC history to see how each would have
  behaved (see `BACKTEST.md`).
- **Playground** — write your own strategy to the same contract; if it returns a `Signal`, the whole
  platform can run it.

---

## 8. Honesty & data integrity

- **No fabricated signals.** If a strategy's conditions aren't met, it returns `neutral` — it never
  invents a trade to look busy.
- **Every signal carries a reason.** The `reason` field explains why the rule fired, so nothing is a
  black box.
- **All open source.** Every strategy's logic lives in the Strategy Library; any signal you see can be
  traced straight back to the code that produced it.

---

*Strategies are educational and research tools. Past behaviour is not a guarantee of future results.
Nothing here is financial advice.*
