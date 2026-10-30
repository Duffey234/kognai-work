import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const tpl = JSON.parse(readFileSync(new URL('../kognai-template.json', import.meta.url)));
const require = createRequire(import.meta.url);

test('A1 kognai-template.json has the engine template fields', () => {
  const { STARTER_TEMPLATES } = require('@kognai/build/dist/templates/index.js');
  const engineKeys = Object.keys(STARTER_TEMPLATES[0]).sort();
  for (const k of engineKeys) assert.ok(k in tpl, `missing engine field ${k}`);
  assert.equal(typeof tpl.id, 'string'); assert.equal(typeof tpl.name, 'string');
  assert.ok(Array.isArray(tpl.intent) && tpl.intent.length > 0 && tpl.intent.every((s) => typeof s === 'string'));
  assert.equal(typeof tpl.default_profile.primary, 'string');
  assert.ok(Array.isArray(tpl.default_profile.secondary));
  assert.ok(Array.isArray(tpl.composition.roles) && tpl.composition.roles.length > 0);
  for (const r of tpl.composition.roles) { assert.equal(typeof r.role, 'string'); assert.ok(Number.isInteger(r.count) && r.count > 0); }
  assert.equal(typeof tpl.workflow, 'string');
  assert.ok(Array.isArray(tpl.skills) && Array.isArray(tpl.tools));
  assert.ok(!STARTER_TEMPLATES.some((t) => t.id === tpl.id), 'id must not clash with a starter template');
});

test('A1 kognai-template.json has a measured cost per run', () => {
  const c = tpl.cost_per_run;
  assert.ok(c && typeof c === 'object');
  assert.equal(typeof c.cloud_usd, 'number'); assert.ok(c.cloud_usd > 0, 'cloud cost is measured, not zero');
  assert.equal(c.sovereign_usd, 0);
  assert.ok(Number.isInteger(c.runs) && c.runs >= 1);
  assert.match(String(c.measured_on), /^\d{4}-\d{2}-\d{2}/);
});
