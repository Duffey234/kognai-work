import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const readme = readFileSync(new URL('README.md', root), 'utf8');
const tpl = JSON.parse(readFileSync(new URL('kognai-template.json', root)));

test('A6 README states what it makes, cloud and sovereign runs and the cost per run', () => {
  assert.match(readme, /## What it makes/);
  assert.match(readme, /## Install/);
  assert.match(readme, /## Run on the cloud/);
  assert.match(readme, /## Run sovereign/);
  assert.match(readme, /--sovereign/);
  assert.match(readme, /## Cost per run/);
  assert.ok(readme.includes(String(tpl.cost_per_run.cloud_usd)), 'README quotes the measured cloud cost');
  assert.ok(!/[\u2013\u2014]/.test(readme), 'no long dashes');
});

test('A6 a sample output is committed under examples/', () => {
  const dir = new URL('examples/', root);
  assert.ok(existsSync(dir));
  const runs = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
  assert.ok(runs.length >= 1);
  const files = readdirSync(new URL(runs[0].name + '/', dir));
  assert.ok(files.includes('brief.md') && files.includes('brief.json'));
  const meta = JSON.parse(readFileSync(new URL(runs[0].name + '/brief.json', dir)));
  assert.equal(typeof meta.cost_usd, 'number');
});
