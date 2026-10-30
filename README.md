# Kognai LAX work: three bid deliverables

Code for three open Kognai LAX bids, one folder per job. MIT licensed, Copyright (c) 2026 Timothy Duffey (see `LICENSE`;
each folder carries the same licence).

| Folder | Kognai job | What it is | Tests |
|---|---|---|---|
| `7ab7ed65-golden-kog-risk-debate/` | 7ab7ed65 Golden Kog risk debate module | TypeScript library: an advocate/reviewer debate over measured risk facts. Strict risk analysis only: no buy, sell or hold signals, no price targets, no trade execution. The model router is injected (`deps.route`). | A1 to A7 offline with a fake route, plus a typecheck and a planted-bug (mutant) check |
| `7b146022-citizen-app-design/` | 7b146022 Citizen app: frontend design and UI/UX | Design tokens (light and dark) and a static clickable prototype of 6 screens in English and Arabic (right to left), 360 px mobile first | A1 to A5 (contrast 4.5:1, EN+AR RTL, 360 px, clickable, accessibility); A6 is the Founder review on Kognai's side (todo) |
| `9db27a4d-kognai-research-brief/` | 9db27a4d Product template on @kognai/build | `kognai-research-brief`: one-line request in, reviewed research brief (brief.md + brief.json) out, built on `@kognai/build`, with measured cost per run | A1 to A6 with a fake engine: no model, no network, no spend |

## Run the tests

Node 20 or later (tested on Node 24). No test calls a model or the network.

```sh
cd 7ab7ed65-golden-kog-risk-debate && npm ci && npm run typecheck && npm test && npm run mutants && cd ..
cd 7b146022-citizen-app-design && npm test && python3 scripts/check_layout.py && cd ..
cd 9db27a4d-kognai-research-brief && npm ci && npm test && cd ..
```

`check_layout.py` needs Python 3 with Playwright (Chromium) for the 360 px render check. The other tests need only Node.

## Notes

- The example run logs in `9db27a4d-kognai-research-brief/examples/` come from two real cloud runs. Output paths are
  shown as `./out`, and transaction hashes are left out of `x402-receipts.json`.
- Test files contain obviously fake key strings (for example `sk-ant-api03-SECRETSECRETSECRET`) on purpose. They
  check that keys are redacted from logs and errors.
