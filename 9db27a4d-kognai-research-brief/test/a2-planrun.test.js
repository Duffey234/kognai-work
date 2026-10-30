import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { planRun } from '../src/index.js';

test('A2 planRun builds the goal and output directory arguments', () => {
  const { args } = planRun({ brief: 'How do stablecoin payments settle on Base' }, '/tmp/out');
  assert.ok(Array.isArray(args) && args.every((a) => typeof a === 'string'));
  const g = args.indexOf('--goal'); const o = args.indexOf('--out-dir');
  assert.ok(g >= 0 && o >= 0);
  assert.match(args[g + 1], /stablecoin payments settle on Base/);
  assert.match(args[g + 1], /brief\.md/);
  assert.ok(args[o + 1] === '/tmp/out' || args[o + 1].startsWith('/tmp/out' + path.sep));
  assert.ok(!args.includes('--sovereign'));
});

test('A2 planRun adds --sovereign only when asked', () => {
  assert.ok(planRun({ brief: 'x', sovereign: true }, '/o').args.includes('--sovereign'));
  assert.ok(!planRun({ brief: 'x', sovereign: false }, '/o').args.includes('--sovereign'));
});

test('A2 planRun never puts a secret in the arguments', () => {
  const prev = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-abcdefghijklmnopqrstuvwxyz';
  try {
    const { args } = planRun({ brief: 'summarise this, my key is sk-ant-api03-SECRETSECRETSECRET and token=abc123' }, '/o');
    const all = args.join(' ');
    assert.ok(!all.includes('sk-ant'), 'no key material');
    assert.ok(!all.includes('abc123'));
    assert.ok(!all.includes(process.env.ANTHROPIC_API_KEY));
    assert.ok(!args.some((a) => /api[-_]?key/i.test(a) && a.startsWith('--')));
  } finally { if (prev === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = prev; }
});

test('A2 planRun rejects an input without a brief', () => {
  assert.throws(() => planRun({}, '/o'), /brief/);
  assert.throws(() => planRun({ brief: '  ' }, '/o'), /brief/);
});
