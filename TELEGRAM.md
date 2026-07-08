# Telegram Bot — The Market Hunter on Telegram

Strategy DEX's market-intelligence and coin-analysis commands, delivered as a Telegram bot. The same
engine that powers the website answers you in chat — live strategy scans, SoSoValue ETF flows, funding,
Fear & Greed and a full market overview, all in one message.

- **Bot:** [t.me/STRATEGYDEX_bot](https://t.me/STRATEGYDEX_bot)
- **Webhook:** `https://straw-pearl.vercel.app/api/telegram/webhook`
- **Scope:** information only — no trading is exposed on Telegram by design.

---

## 1. What it is

The bot is a **thin client**. It does not re-implement any logic; it calls the site's own APIs (the
strategy scan via the MCP tool, ETF, skills-signal, news, tickers) plus public data (OKX/Bybit funding,
alternative.me Fear & Greed) and formats the result for chat.

Because it is **event-driven** — Telegram calls the webhook only when a user sends a message — it needs
**no cron and no always-on server**, so it runs comfortably on a free Vercel plan. The same
`scan_live_signals` MCP tool feeds the bot's strategy reads, which means the website, the AI assistant
and the bot all speak to the exact same engine.

---

## 2. Getting started

Open [t.me/STRATEGYDEX_bot](https://t.me/STRATEGYDEX_bot) and send `/start`. You'll get a welcome message
with a button menu (Hunt, Market, Movers, News, Fear & Greed, BTC ETF, BTC scan, Why BTC, and an "Open
Web App" link). Tap a button or type any command below.

You can also just send a **bare ticker** — `btc`, `sol`, `mon` — for a full scan plus ETF.

---

## 3. Commands

### Market intelligence

| Command | What it returns |
|---------|-----------------|
| `/hunt` | Scans the most active markets through all strategies and ranks the strongest LONG and SHORT setups by net conviction. |
| `/market` | Full overview: regime (with confidence), Fear & Greed with label, BTC dominance + Altseason, BTC 7d/30d, breadth, BTC & ETH ETF net flows (daily + 7-day), risk flags and the playbook bias. |
| `/movers` (`/top`) | Top 5 gainers and top 5 losers over 24h. |
| `/news` | Latest SoSoValue headlines, each tagged bullish/bearish/neutral. |
| `/fg` (`/fear`) | Fear & Greed value, a visual bar and the 7-day trend. |
| `/funding <coin>` | Perp funding rate (OKX/Bybit), annualized, with a crowd-positioning read. |

### Coin analysis

| Command | What it returns |
|---------|-----------------|
| `/coin <sym>` | Full scan + ETF flows in one shot (e.g. `/coin btc`). |
| `/signals <sym>` | Strategy scan only: long/short tally + top 5 signals with reasons. |
| `/etf <sym>` | ETF flows only: daily, 7-day, cumulative, AUM. |
| `/why <sym>` | A reasoned verdict fusing strategies, family consensus, funding, Fear & Greed and ETF flows into one long/short/mixed conclusion. |
| `/setup <sym>` | An ATR-sized trade plan: direction, SL at 1.5x ATR, TP at 3x ATR, suggested leverage. |
| `/confluence <sym>` | Which strategy families agree — each category's long/short vote plus a consensus line. |
| `/compare <a> <b>` | Two coins scanned side by side. |
| `/price <sym>` | Quick live price. |

### Shortcuts

- **Bare ticker:** `btc` -> full scan + ETF. `mon` -> scan only (no ETF market).
- **Ticker + sub-command:** `btc signals`, `btc why`, `btc setup`, `btc etf`, `btc funding`, `btc price`.
- `/start` -> welcome + button menu. `/help` -> full command list.

Every listed market on the site is supported — send whatever ticker the Market page shows, including
assets that don't exist on major exchanges (the bot reads the site's own candles first).

---

## 4. The /start button menu

`/start` returns an inline keyboard so users don't have to remember commands:

```
[🎯 Hunt]         [🌍 Market]
[🚀 Movers]       [📰 News]
[😨 Fear & Greed] [💹 BTC ETF]
[📡 BTC scan]     [🤔 Why BTC]
[🌐 Open Web App]
```

Tapping a button runs its command instantly; "Open Web App" links to the AI Trade terminal on the
website.

---

## 5. Self-hosting / re-deploying (for maintainers)

The bot lives in the same repository as the site, at `app/api/telegram/webhook/route.ts`. To run your
own instance:

1. **Create a bot** with [@BotFather](https://t.me/BotFather): send `/newbot`, get the token.
2. **Set environment variables** in Vercel:
   - `TELEGRAM_BOT_TOKEN` — the BotFather token (required).
   - `TELEGRAM_SECRET` — an optional shared secret; if set, the webhook verifies Telegram's
     `x-telegram-bot-api-secret-token` header.
3. **Deploy**, then **register the webhook** (replace `<TOKEN>` and `<DOMAIN>`):
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN>/api/telegram/webhook
   ```
   A `{"ok":true,"result":true}` response means it's set.
4. **Verify:** open `https://<DOMAIN>/api/telegram/webhook` — a `GET` returns
   `{ "bot": "strategy-dex", "status": "configured", ... }` when the token is present.
5. **(Optional) command menu:** send `/setcommands` to BotFather and paste the command list so `/` shows
   an autocomplete menu.

Common issues:
- **Bot silent after setWebhook** -> token missing in Vercel, or env added but not redeployed. Check the
  `GET` status, then redeploy.
- **`getWebhookInfo`** (`https://api.telegram.org/bot<TOKEN>/getWebhookInfo`) shows the last delivery
  error if something is wrong.

---

## 6. Design notes

- **Info only.** No demo trading, positions or wallet on Telegram — those stay in the web app, where the
  session wallet lives. This keeps the bot stateless and safe.
- **Thin client.** All heavy logic stays on the site; the bot just calls and formats. One source of
  truth, no divergence between surfaces.
- **Multi-source resilience.** Funding tries OKX then Bybit (Binance is geo-blocked from some regions);
  candles fall back through SoDEX -> Coinbase -> CryptoCompare so tickers resolve widely.
- **Never fabricates.** If a source fails, the bot says so instead of inventing numbers.

---

*Educational and research tooling. Past behaviour is not a guarantee of future results. Nothing here is
financial advice.*
