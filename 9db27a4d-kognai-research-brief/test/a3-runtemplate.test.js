import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runTemplate } from '../src/index.js';
import { tmp, fakeExec } from './support/helpers.js';

const BRIEF = '# Stablecoin settlement on Base\n\n## Summary\n- one\n\n## Key findings\n1. a\n';

test('A3 runTemplate runs the engine through exec and shapes the product files', async () => {
  const outDir = await tmp();
  const exec = fakeExec({ 'brief.md': BRIEF });
  const r = await runTemplate({ brief: 'stablecoin settlement on Base' }, { outDir, exec });
  assert.equal(exec.seen.length, 1);
  assert.ok(exec.seen[0].includes('--goal'));
  assert.equal(r.outDir, outDir);
  assert.deepEqual(r.files.map((f) => path.basename(f)), ['brief.md', 'brief.json']);
  for (const f of r.files) assert.ok(f.startsWith(outDir));
  assert.match(await readFile(r.files[0], 'utf8'), /Stablecoin settlement on Base/);
  const meta = JSON.parse(await readFile(r.files[1], 'utf8'));
  assert.equal(meta.title, 'Stablecoin settlement on Base');
  assert.deepEqual(meta.sections, ['Stablecoin settlement on Base', 'Summary', 'Key findings']);
  assert.equal(meta.mode, 'cloud');
  assert.equal(meta.model_calls, 5);
});

test('A3 runTemplate takes cost_usd from the engine output', async () => {
  const r = await runTemplate({ brief: 'x' }, { outDir: await tmp(), exec: fakeExec({ 'brief.md': BRIEF }, { cost: '0.1234' }) });
  assert.equal(r.cost_usd, 0.1234);
});

test('A3 runTemplate reports 0 cost when sovereign', async () => {
  const exec = fakeExec({ 'brief.md': BRIEF }, { cost: '0.9000' });
  const r = await runTemplate({ brief: 'x', sovereign: true }, { outDir: await tmp(), exec });
  assert.equal(r.cost_usd, 0);
  assert.ok(exec.seen[0].includes('--sovereign'));
});

test('A3 runTemplate merges several engine files into one brief', async () => {
  const r = await runTemplate({ brief: 'x' }, { outDir: await tmp(), exec: fakeExec({ 'a.md': '# A\nalpha', 'sub/b.md': '## B\nbeta' }) });
  const md = await readFile(r.files[0], 'utf8');
  assert.match(md, /alpha/); assert.match(md, /beta/);
});

test('A3 runTemplate removes long dashes from the product text', async () => {
  const r = await runTemplate({ brief: 'x' }, { outDir: await tmp(), exec: fakeExec({ 'brief.md': '# T\n\nheat pumps \u2014 in cold \u2013 climates' }) });
  const md = await readFile(r.files[0], 'utf8');
  assert.ok(!/[\u2013\u2014]/.test(md));
  assert.match(md, /heat pumps, in cold - climates/);
});
