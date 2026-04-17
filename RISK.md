# Risk Disclosures & Operational Costs

Read this before running any strategy with real capital.

---

## 1. This is a paper-trading prototype, not a production trading system

- The scheduled tasks run inside Claude Code on **your local machine**. If your computer sleeps, restarts, loses internet, or Claude Code closes, all monitoring stops silently. There is no process supervisor, no cloud failover, no alerting.
- An LLM (Claude) is making execution decisions. LLMs are probabilistic — they can misread output, hallucinate values, and make logical errors. This is not a deterministic rules engine.
- Paper trading hides real costs: bid/ask spreads, slippage, partial fills, borrow fees for short positions, and liquidity constraints on thinly-traded options. Simulated fills are optimistic.

---

## 2. Strategy-specific risks

### Trailing Stop
- **ATR stops reduce whipsaw but do not eliminate drawdown.** A 2.5× ATR stop on TSLA allows roughly ±$15–25 of room in normal conditions. In a gap-down open (earnings, macro shock) the stock can blow through the stop level before the market opens and you fill at a much worse price.
- **Ladder buys into a declining stock.** Averaging down feels rational but accelerates losses if the move is structural (business deterioration, sector rotation) rather than noise. Each ladder level increases concentration risk.
- **The deep ladder (L3/L4 at −20/−30 %) requires widening the stop loss.** Running these simultaneously with a −10 % stop means the stop fires before the ladders ever trigger — the levels are mutually exclusive without manually adjusting `STOP_LOSS_PCT`.

### Wheel Strategy (Cash-Secured Puts + Covered Calls)

**Capital requirements — not optional:**

| Contract | Required capital | Example (TSLA @ $250) |
|---|---|---|
| 1 cash-secured put, $225 strike | $22,500 | $225 × 100 shares |
| 1 covered call | 100 shares already owned | ~$25,000 at cost |

The code verifies cash before selling puts. It does **not** verify margin requirements if you have a margin account — cash-secured and margin-secured puts have different risk profiles.

- **"Income regardless of market direction" is a marketing claim, not a fact.** Selling puts is economically equivalent to being long the stock and short a call. If the stock drops 40 %, assignment at your strike gives you shares worth 40 % less than you paid. The premium collected does not come close to covering that loss.
- **The 50 % profit close rule does not protect against gap risk.** A contract can jump from 20 % profit to deeply in-the-money overnight.
- **Rolling contracts forward adds complexity that this bot does not handle.** If a put is deep in-the-money near expiry, the correct action is often to roll (buy to close, sell a later expiry). The current implementation will simply get assigned and move to Stage 2 — which may not be what you want at a bad cost basis.
- **Never sell a call below cost basis is enforced in code, but cost basis tracking only covers premiums collected within this bot's state file.** If you manually trade the position, the state file will be wrong.

### Capitol Trades Copy Trading
- **Disclosure lag: 30–45 days.** The STOCK Act requires disclosure within 45 calendar days. The trades you see on Capitol Trades happened weeks ago. The price move you are trying to capture has already occurred.
- **You are not copying insider knowledge — you are copying public filings.** By the time a trade is disclosed, it is already public information and priced in by professional arbitrageurs who watch the same feed.
- **No performance data.** There is no verified track record for any politician's disclosed trades producing alpha over a benchmark after accounting for the disclosure delay.

---

## 3. Token and API costs

Every scheduled task spawns a Claude agent. Agents read context, run shell commands, parse output, and generate a response. Approximate costs at current Claude Sonnet pricing:

| Task | Frequency | Runs/week | Est. tokens/run | Est. $/week |
|---|---|---|---|---|
| Trailing stop check | Every 1 min, market hours | ~1,950 | ~3,000 | ~$10–30 |
| Wheel 15-min check | Every 15 min, market hours | ~140 | ~3,000 | ~$1–3 |
| Capitol Trades copy | Every 30 min, market hours | ~70 | ~5,000 | ~$1–3 |
| Daily summaries | Once/day | 5 | ~2,000 | <$0.50 |
| **Total** | | | | **~$12–37/week** |

The trailing stop every-minute schedule is the dominant cost. Consider changing it to every 5 minutes (`*/5 9-15 * * 1-5`) if you want to reduce token burn — for a momentum stock like TSLA the difference in execution quality is negligible.

Alpaca paper trading API calls are free.

---

## 4. Regulatory notes

- Fully automated retail trading is legal in the US. Using an LLM as the decision layer is legal but untested in enforcement contexts.
- Copying congressional trade disclosures is legal — the data is public under the STOCK Act. It is not insider trading because the information is already public by the time it is disclosed.
- Options trading requires options approval from your broker. Alpaca paper trading may grant this automatically; live accounts require application.

---

## 5. What this codebase is good for

- **Learning** — understanding how options strategies work mechanically, how to interact with a broker API, how state machines model trading logic.
- **Prototyping** — testing strategy ideas against real market data with zero financial risk.
- **Building intuition** — seeing how ATR adapts to volatility compared to fixed percentages, how wheel premiums accumulate over time.

It is not a substitute for a backtested, statistically validated, professionally risk-managed trading system.
