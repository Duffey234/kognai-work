# kognai-research-brief

A product template that runs on the Kognai engine through `@kognai/build`. You give it one line ("what do you want a brief on"), it turns that into an `@kognai/build` goal, runs the engine (plan, generate, two code reviews, compliance review) and shapes the result into a finished research brief.

## What it makes

For every run, under your output folder:

- `brief.md`: a reviewed research brief with a title, Summary (3 bullets), Background, Key findings (numbered, each with why it matters), Open questions and Sources to check. Long dashes are normalised away.
- `brief.json`: metadata for the run: title, the request, cloud or sovereign, section list, word count, the engine files it came from, model calls and `cost_usd`.
- `engine/`: the raw engine output, kept for audit.

The template metadata lives in `kognai-template.json` (same fields as the engine's `STARTER_TEMPLATES`, plus `cost_per_run`).

## Install

Node 20 or later.

```bash
npm ci            # lockfile, no install scripts
npm test          # 6 acceptance groups A1 to A6, no network
```

## Run on the cloud

The engine reads the key from the environment, never from arguments.

```bash
export ANTHROPIC_API_KEY=...            # your own key
npx kognai-research-brief "How well air source heat pumps work in cold climates" --out ./out
```

From code:

```js
import { planRun, runTemplate } from 'kognai-research-brief';
planRun({ brief: 'coral reef bleaching' }, './out');
// { args: ['--goal', '<goal text>', '--out-dir', 'out/engine'] }
const r = await runTemplate({ brief: 'coral reef bleaching', length: 'short' }, { outDir: './out' });
// { outDir: './out', files: ['out/brief.md', 'out/brief.json'], cost_usd: 0.01 }
```

Input fields: `brief` (required), `sovereign` (boolean), `length` (`short`, `standard`, `long`), `audience` (string). Anything that looks like a key in the brief is replaced with `[redacted]` before it reaches the engine.

`runTemplate` takes an optional `exec(args) -> Promise<{code, stdout, stderr}>`; the default runs the locally installed `@kognai/build` binary (or `npx @kognai/build`). A non zero exit or an empty output is rejected with a plain reason, for example `engine failed with exit code 2: error: ANTHROPIC_API_KEY not set` or `engine wrote nothing: no non empty file in out/engine`.

## Run sovereign

```bash
ollama pull qwen3:14b && ollama pull qwen3:4b
npx kognai-research-brief "How well air source heat pumps work in cold climates" --out ./out --sovereign
```

`--sovereign` is passed to the engine, every model call goes to local Ollama, no key is needed and `cost_usd` is 0.

## Cost per run

Measured on 2026-10-21 with `@kognai/build` 0.7.10, 2 real cloud runs, 5 model calls each (plan, generate, two reviews, compliance):

| Run | Request | Engine cost (USD) |
|---|---|---|
| 1 | air source heat pumps in cold climates | 0.0115 |
| 2 | coral reef bleaching and recovery | 0.0100 |
| Mean | | 0.0108 |

`cost_per_run.cloud_usd` = 0.0108 (engine footer cost, real token usage at list price, with `CLAUDE_MODEL=claude-haiku-4-5-20251001`). With the engine's default Sonnet model, expect roughly 4 times that. `cost_per_run.sovereign_usd` = 0.

How it was measured: the model calls were paid per call over x402 in USDC on Base (no API key). Per-call records for all 10 calls (time, amount, model, token usage) are in `examples/x402-receipts.json`; transaction hashes are omitted from this bundle.

## Sample output

- `examples/heat-pumps-cloud/` (brief.md, brief.json, engine-log.txt)
- `examples/coral-bleaching-cloud/`

## License

MIT
