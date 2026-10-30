#!/usr/bin/env node
// Planted bug check: apply each mutant from scripts/mutants.json to a scratch copy of the repo,
// run `npm test` there, and expect the suite to FAIL. A mutant the tests miss is reported as SURVIVED.
// No network. Usage: npm run mutants   (exit 0 only when every mutant is caught)
import { readFileSync, writeFileSync, cpSync, mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const mutants = JSON.parse(readFileSync(join(root, 'scripts/mutants.json'), 'utf8'));
let survived = 0;
const rows = [];
for (const m of mutants) {
  const dir = mkdtempSync(join(tmpdir(), 'mutant-'));
  try {
    cpSync(root, dir, { recursive: true, filter: (p) => !/(^|\/)(node_modules|\.git|dist)(\/|$)/.test(p.slice(root.length)) });
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'));
    const f = join(dir, m.file);
    const src = readFileSync(f, 'utf8');
    if (!src.includes(m.find)) throw new Error(`mutant "${m.name}": text not found in ${m.file}`);
    writeFileSync(f, src.replace(m.find, m.replace));
    const r = spawnSync('npm', ['test', '--silent'], { cwd: dir, encoding: 'utf8', timeout: 90000, env: { ...process.env, LAX_LIVE: '', SOLANA_LIVE: '' } });
    const caught = r.status !== 0;
    if (!caught) survived++;
    rows.push(`${caught ? 'CAUGHT  ' : 'SURVIVED'}  ${m.name}  (${m.file})`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
console.log(rows.join('\n'));
console.log(`\n${mutants.length - survived} of ${mutants.length} planted bugs caught`);
process.exit(survived ? 1 : 0);
