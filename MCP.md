# MCP Server — Strategy DEX as AI-Callable Tools

Strategy DEX exposes its entire engine as an **MCP (Model Context Protocol) server**, so any
MCP-compatible AI assistant (Claude, and others) can call the platform's strategies, backtests, market
data and SoSoValue layers directly — no SDK, no scraping, no glue code. This turns Strategy DEX from a
website you look at into a **toolset an AI can reason with**.

- **Endpoint:** `https://straw-pearl.vercel.app/api/mcp`
- **Protocol:** MCP over JSON-RPC 2.0, Streamable HTTP transport
- **Protocol version:** `2024-11-05`
- **Auth:** none required (CORS-enabled, public read-only tools)
- **Server version:** 1.4.0

---

## 1. Why this exists

Every strategy on the site implements one shared contract — `run(candles) -> Signal`. Because the whole
engine speaks that single shape, it can be wrapped as tools cleanly: the same code that powers Active
Signals, the Backtest and AI Trade is what answers an AI assistant's call. The AI is not getting a
scraped summary of the site; it is running the real engine.

The result is an **AI-native trading research surface**. An assistant can ask "which strategies are long
on BTC right now?", "where's the strongest setup in the market?", or "how does the tape look?" and get a
real, reasoned answer straight from the engine.

---

## 2. Connecting

### Claude (or any MCP client)
1. Open **Settings → Connectors**.
2. **Add custom connector.**
3. URL: `https://straw-pearl.vercel.app/api/mcp`
4. Save, then start a new conversation.

If you update the server (new tools), remove and re-add the connector so the client re-reads the tool
list, then open a fresh chat.

### Quick check (browser)
Open the endpoint in a browser. A `GET` returns server info and the tool list:

```json
{
  "name": "strategy-dex",
  "version": "1.4.0",
  "transport": "streamable-http",
  "protocol": "mcp",
  "tools": [ { "name": "hunt_setups", "description": "..." }, ... ]
}
```

### Direct call (curl)
```bash
curl -X POST https://straw-pearl.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"scan_live_signals","arguments":{"symbol":"BTC"}}}'
```

---

## 3. Protocol details

The server implements the core MCP JSON-RPC methods:

| Method | Purpose |
|--------|---------|
| `initialize` | Handshake; returns `protocolVersion`, capabilities and server info. |
| `tools/list` | Returns all 19 tools with their JSON-Schema input definitions. |
| `tools/call` | Runs a tool; params are `{ name, arguments }`. |
| `ping` | Liveness check. |
| `notifications/*` | Accepted and acknowledged (204). |

Every tool result comes back as MCP text content:
```json
{ "content": [ { "type": "text", "text": "<JSON or message>" } ] }
```
Most tools return a JSON string inside that text block, so the assistant can parse structured data.

---

## 4. The 19 tools

### Strategy engine

**`list_categories`** — All strategy categories with how many strategies each holds.
Input: none.

**`list_strategies`** — Strategies (id, name, category), optionally filtered.
Input: `category?` (e.g. `"momentum"`, `"smc"`).

**`scan_live_signals`** — Runs **every strategy** on a symbol's latest real price history and returns
the ones firing long or short, with a tally and each signal's reason. Works for **any listed market**
(BTC, ETH, SOL, MON, XAUT, ...), because it reads the site's own SoDEX candles first.
Input: `symbol` (required).

**`backtest_strategy`** — Backtests a single strategy on real BTC history (long + short, minimum-hold
and trading-cost controls) and returns Return, Sharpe, Max Drawdown, Win rate and Exposure.
Input: `strategyId` (required), `days?`.

### Market hunter

**`hunt_setups`** — Scans the most active markets, runs all strategies on each, scores net conviction
(long confidence minus short confidence) and returns the **strongest LONG and SHORT setups**. The "where
is the opportunity right now?" tool.
Input: `direction?` — `"long"`, `"short"` or `"both"` (default both).

**`analyze_coin`** — A full reasoned read of one coin in a single call: strategy tally + net conviction,
**strategy-family consensus** (which categories lean long vs short), funding rate, ETF 7-day net flow,
and a net **long / short / mixed** verdict.
Input: `symbol` (required).

**`get_trade_setup`** — An **ATR-sized trade plan**: engine direction, stop-loss at 1.5x ATR,
take-profit at 3x ATR (1:2 risk/reward), the ATR percentage, and a volatility-adjusted leverage
suggestion.
Input: `symbol` (required).

### Market data

**`get_market_overview`** — One-call tape read: regime (with confidence), Fear & Greed, BTC dominance,
Altseason, BTC 7d/30d returns, market breadth, BTC/ETH ETF net 7-day flows, engine risk flags and the
playbook bias.
Input: none.

**`get_funding`** — Perp funding rate for a coin (OKX, with Bybit fallback): rate per 8h, annualized
figure, and a crowd-positioning read (who is paying whom; squeeze / contrarian zones).
Input: `symbol` (required).

**`get_fear_greed`** — The Crypto Fear & Greed Index: current value, classification, and the 7-day
change.
Input: none.

**`get_news`** — Latest SoSoValue headlines, each tagged bullish / bearish / neutral, plus an overall
news-tone summary.
Input: none.

**`get_movers`** — Top 5 gainers and top 5 losers over 24h across the listed markets.
Input: none.

**`get_ssi`** — SoSoValue Indices (MAG7.ssi, DEFI.ssi, MEME.ssi) 24h momentum with a directional bias
per index.
Input: none.

### SoSoValue

**`get_etf_flows`** — US/HK spot-ETF flows for an asset: latest daily and cumulative net inflow, AUM,
per-fund breakdown and recent history.
Input: `asset` (required; prefix `hk-` for Hong Kong ETFs, e.g. `hk-btc`).

---

## 5. Data sources

The tools reuse the same real sources the website does — never mock data:

| Layer | Source |
|-------|--------|
| Candles / prices | Site SoDEX klines first (all listed markets), then Coinbase / CryptoCompare / CMC as fallbacks |
| Strategy signals | The site's own 270+ open-source strategies (`run(candles) -> Signal`) |
| ETF flows | SoSoValue API |
| News + sentiment | SoSoValue feed with a weighted, negation-aware classifier |
| Regime / risk / playbook | The site's 24-skill regime engine |
| Fear & Greed | alternative.me public API |
| Funding | OKX (Bybit fallback) |
| SSI indices | SoDEX spot markets |

The SoDEX-first candle chain is why every market on the site — including assets that don't exist on
major exchanges — works in `scan_live_signals`, `analyze_coin`, `hunt_setups` and `get_trade_setup`.

---

## 6. Example prompts

Once connected, natural language is enough — the assistant picks the tool:

- "What's the strongest setup in the market right now?" -> `hunt_setups`
- "Analyze SOL for me." -> `analyze_coin`
- "How does the market look today?" -> `get_market_overview`
- "Which strategies are long on MON?" -> `scan_live_signals`
- "Give me a trade plan for ETH." -> `get_trade_setup`
- "What's BTC funding doing?" -> `get_funding`
- "Backtest the RSI Divergence strategy." -> `backtest_strategy`
- "What are the BTC ETF flows?" -> `get_etf_flows`

---

## 7. Design notes & honesty

- **One engine, many surfaces.** The website, AI Trade, the Telegram bot and this MCP server all speak
  to the exact same strategy engine. There is no separate "AI version" of the logic.
- **Never fabricates.** If a source is unavailable, a tool returns an honest error message rather than
  an invented number.
- **Read-only.** Every tool is informational. No trading, no writes, no account access — safe to expose
  publicly.
- **Additive.** The MCP route is a standalone endpoint; it reads existing libraries and does not modify
  any other part of the site.

---

*Educational and research tooling. Past behaviour is not a guarantee of future results. Nothing here is
financial advice.*
