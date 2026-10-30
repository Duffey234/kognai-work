#!/usr/bin/env node
// Usage: kognai-research-brief "<what you want a brief on>" [--out ./out] [--sovereign] [--length short|standard|long]
import { runTemplate } from './index.js';
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
const sovereign = argv.includes('--sovereign');
const outDir = flag('--out') || './brief-out';
const length = flag('--length');
const brief = argv.filter((a) => a !== '--sovereign').join(' ').trim();
if (!brief) { console.error('usage: kognai-research-brief "<topic>" [--out dir] [--sovereign] [--length short|standard|long]'); process.exit(2); }
runTemplate({ brief, sovereign, ...(length ? { length } : {}) }, { outDir })
  .then((r) => { console.log(JSON.stringify(r, null, 2)); })
  .catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
