# Golden Kog risk debate

A small TypeScript module that adds a two sided structure debate to a token risk analysis. Two advocates argue from measured facts, one for a sound structure and one for a fragile structure, and then a reviewer weighs them. It is a risk tool and never a trading tool: no buy or sell view, no price target, no entry or exit, no advice. The debate never returns or changes a risk level or points.

**Not financial advice.** This module is a risk analysis library only. It gives no buy, sell or hold signal, makes no price prediction, and cannot place or execute any trade: it has no wallet, no key, no exchange or swap code and no network call of its own.

## What it never does

- No buy, sell or hold signal, rating or recommendation. The job's refused terms are checked, plus a stricter built in list (`TRADE_SIGNAL_TERMS` in `src/rules.ts`: strong buy, hold rating, should sell, price will, stop loss, go short and more). A part that uses one is refused like any other rule break.
- No price prediction or price target. Every number must already be in the measured facts, so a part cannot invent a price.
- No trade execution. The only outside call is `deps.route`, the caller's model router; the module never sees a wallet or a key.
- No change to the risk result. `level` and `points` are read, never returned or changed.

## Quick start (about one minute)

```sh
cd 7ab7ed65-golden-kog-risk-debate
npm ci && npm test   # A1 to A7 with a fake route, no model, no network
npm run mutants      # planted bug check: 10 of 10 planted bugs caught
```

No runtime dependency. Node 22. The model is whatever `deps.route` calls, so the module never holds a key.

## Credit

The advocate and reviewer pattern is adapted from TradingAgents by TauricResearch (https://github.com/TauricResearch/TradingAgents, Apache 2.0). Its trader and portfolio manager roles are left out on purpose: only the structure debate and its review are kept.

## Use

```ts
import { debate } from './src/debate.js';

const d = await debate(
  { facts_text, level, points, flag_ids, unknown },
  { route, check, mode: 'shadow', log, timeoutMs: 45000 },
);
```

- `route(args)` sends one model call and answers `{content, model?, cost_usd?}`.
- `check(text)` is optional: the caller's own guard, which returns a list of problems (empty means fine).
- `mode` is `'off'` (no call at all), `'shadow'` (default: runs everything, passes the Debate to `log`, returns it with `shown: false`) or `'on'` (`shown: true`).

## Call flow

```
facts_text, flag_ids, unknown
        |
        +--> route(role sound,   complexity exec) --+   (in parallel)
        +--> route(role fragile, complexity exec) --+
                                                    |
              rules on each advocate text; a failing part becomes
              "No case could be written from the measured facts."
                                                    |
        route(role reviewer, complexity apex) with facts_text and both texts
                                                    |
              reviewer JSON {text, weight, unknown, tension?} parsed and checked;
              weight keeps only ids in flag_ids
                                                    |
                                                  Debate
```

Every call has `task_type: 'risk_debate'`, `tier_class: 'text'`, `constitutional_flag: false`, `agent_id: 'golden-kog'`, an estimated `context_tokens` and a payload `{role, system, prompt, max_tokens}`. Each call is raced against `timeoutMs`. A call over it gives `status: 'timeout'`, and nothing is thrown.

## Rules

Every part (each advocate text, the reviewer text and its tension) must pass all of these:

1. Every number in it appears in `facts_text`, written the same way (`182,400` does not match `182400`). Digits inside an identifier such as `top10_concentration` are not numbers.
2. None of the refused terms from the job: bull, bear, bullish, bearish, upside, downside target, undervalued, overvalued, accumulate, moon, buy now, sell now, price target, entry, exit, take profit, not financial advice. They are matched as whole words, case insensitive, so "bearing" passes. The stricter `TRADE_SIGNAL_TERMS` list (buy, sell or hold signals, price predictions, trade instructions) is checked the same way.
3. `deps.check(text)` returns nothing.
4. At most 180 words per advocate and 150 for the reviewer.
5. Latin digits only, and no dash characters (any Unicode dash punctuation, the hyphen included).

A failing advocate part is replaced by "No case could be written from the measured facts." and its reasons go in `rejected`. A failing or unparseable reviewer part gives `status: 'rejected'` with empty texts. `usd` is the sum of `cost_usd` over the calls made.

## Example Debate

Made by `npx tsx examples/example.ts` with a canned route (no model):

```json
{
  "status": "ok",
  "shown": true,
  "sound": "Mint authority is revoked, so supply cannot grow. Liquidity of 182,400 USDC is locked for 365 days, which keeps the pool in place. The creator wallet holds only 3.2% of supply.",
  "fragile": "The top 10 holders own 41.5% of supply, so a few wallets could drain the pool depth quickly. At 47 days the token has a short record.",
  "reviewer": "The revoked mint and the locked pool carry real weight. The main structural risk is that 41.5% sits with the top 10 holders while the token is 47 days old.",
  "weight": [
    "top10_concentration",
    "young_token"
  ],
  "unknown": [
    "team identity"
  ],
  "models": {
    "sound": "exec-model",
    "fragile": "exec-model",
    "reviewer": "apex-model"
  },
  "usd": 0.0062,
  "rejected": [],
  "tension": "Locked liquidity against concentrated holdings."
}
```

`made_up_flag` from the reviewer was dropped from `weight` because it is not in `flag_ids`.

## Tests

`npm test` runs A1 to A7 with a fake route, with no model and no network:

| Test | Proves |
|---|---|
| A1 | the advocates run in parallel as sound and fragile (exec), then the reviewer (apex) gets both texts and the facts |
| A2 | an unknown number replaces the advocate part, or drops the debate for the reviewer, with the reason kept |
| A3 | refused terms, dashes, non Latin digits, word limits and `deps.check` problems are refused the same way |
| A4 | reviewer JSON (plain or fenced) is parsed, `weight` keeps known flag ids only, and bad JSON gives `rejected` |
| A5 | a call over `timeoutMs` gives `timeout` without throwing |
| A6 | off makes no call, shadow logs and is not shown, on is shown, and `usd` sums the calls |
| A7 | this README has the call flow, the rules, an example Debate and the credit |

## Licence

MIT. Copyright (c) 2026 Timothy Duffey. See LICENSE.
