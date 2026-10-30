import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root)));

test('A5 a lockfile is committed and matches package.json', () => {
  assert.ok(existsSync(new URL('package-lock.json', root)), 'package-lock.json present');
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', root)));
  assert.equal(lock.name, pkg.name);
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.ok(lock.packages['node_modules/@kognai/build'], '@kognai/build is locked');
});

test('A5 no install script anywhere in the tree', () => {
  for (const s of ['preinstall', 'install', 'postinstall', 'prepare']) assert.ok(!(pkg.scripts && s in pkg.scripts), `no ${s}`);
  const lock = JSON.parse(readFileSync(new URL('package-lock.json', root)));
  const withScripts = Object.entries(lock.packages).filter(([, p]) => p.hasInstallScript).map(([k]) => k);
  assert.deepEqual(withScripts, []);
});

test('A5 Node 20 or later and npm test runs offline', () => {
  assert.match(pkg.engines.node, />=\s*2\d/);
  assert.match(pkg.scripts.test, /^node --test/);
  assert.equal(pkg.type, 'module');
});
