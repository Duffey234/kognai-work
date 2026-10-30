// kognai-research-brief: a product template on @kognai/build.
// input -> @kognai/build goal -> engine run -> brief.md + brief.json
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ENGINE_SUBDIR = 'engine';
export const PRODUCT_FILES = ['brief.md', 'brief.json'];
const LENGTHS = { short: '400 to 600 words', standard: '800 to 1200 words', long: '1500 to 2000 words' };

// Anything that looks like a credential is removed from the goal text, so a
// key pasted into a brief never reaches the engine arguments or its logs.
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{12,}/g,               // Anthropic / OpenAI style keys
  /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{12,}/g,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/g,        // Slack
  /\bAKIA[0-9A-Z]{16}\b/g,                 // AWS access key id
  /\b0x[0-9a-fA-F]{64}\b/g,                // raw 32 byte hex (private keys)
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi,
];

export function redactSecrets(text) {
  let out = String(text);
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

function validateInput(input) {
  if (!input || typeof input !== 'object') throw new TypeError('input must be an object with a brief');
  if (typeof input.brief !== 'string' || !input.brief.trim()) throw new TypeError('input.brief must be a non empty string');
  if (input.length !== undefined && !(input.length in LENGTHS)) {
    throw new TypeError(`input.length must be one of ${Object.keys(LENGTHS).join(', ')}`);
  }
}

export function buildGoal(input) {
  validateInput(input);
  const brief = redactSecrets(input.brief.trim()).replace(/\s+/g, ' ');
  const audience = input.audience ? redactSecrets(String(input.audience)).replace(/\s+/g, ' ') : 'a busy non specialist reader';
  const length = LENGTHS[input.length || 'short'];
  return [
    `Write a research brief as ONE Markdown file named brief.md (a single task, no code files).`,
    `Topic: ${brief}.`,
    `Audience: ${audience}. Length: ${length}.`,
    `Structure: a level 1 title, then the sections "## Summary" (3 bullet points),`,
    `"## Background", "## Key findings" (numbered, each with a one line why it matters),`,
    `"## Open questions" and "## Sources to check" (named publications or datasets, no invented URLs or figures).`,
    `Plain language, no hype, state uncertainty where it exists.`,
  ].join(' ');
}

// planRun(input, outDir) -> { args }: the @kognai/build arguments. Never a key.
export function planRun(input, outDir) {
  validateInput(input);
  if (typeof outDir !== 'string' || !outDir) throw new TypeError('outDir must be a non empty string');
  const args = ['--goal', buildGoal(input), '--out-dir', path.join(outDir, ENGINE_SUBDIR)];
  if (input.sovereign === true) args.push('--sovereign');
  return { args };
}

function stripAnsi(s) {
  return String(s).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

// The engine prints "Total: <time> · <n> model calls · $<usd>" as its footer.
export function parseCost(stdout) {
  const text = stripAnsi(stdout);
  const footer = [...text.matchAll(/Total:[^\n]*?\$\s*([0-9]+(?:\.[0-9]+)?)/g)];
  if (footer.length) return Number(footer[footer.length - 1][1]);
  const json = [...text.matchAll(/"cost_usd"\s*:\s*([0-9]+(?:\.[0-9]+)?)/g)];
  if (json.length) return Number(json[json.length - 1][1]);
  return 0;
}

export function parseCalls(stdout) {
  const m = [...stripAnsi(stdout).matchAll(/Total:[^\n]*?([0-9]+) model calls/g)];
  return m.length ? Number(m[m.length - 1][1]) : null;
}

function resolveEngineBin() {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require.resolve('@kognai/build/package.json');
    const bin = path.join(path.dirname(pkg), 'dist', 'bin', 'kognai-build.js');
    if (existsSync(bin)) return { cmd: process.execPath, pre: [bin] };
  } catch { /* fall back to npx */ }
  return { cmd: 'npx', pre: ['-y', '@kognai/build@^0.7'] };
}

// Default exec: runs @kognai/build (the local dependency, else npx @kognai/build).
// Credentials come only from the environment (ANTHROPIC_API_KEY), never from args.
export function defaultExec(args, { env = process.env, timeoutMs = 20 * 60 * 1000 } = {}) {
  const { cmd, pre } = resolveEngineBin();
  return new Promise((resolve) => {
    const child = spawn(cmd, [...pre, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: 127, stdout, stderr: stderr + String(e.message) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
  });
}

async function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue; // .kognai workspace state, dotfiles
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(p));
    else if (e.isFile()) out.push(p);
  }
  return out.sort();
}

function lastLine(s) {
  const lines = stripAnsi(s).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1].slice(0, 200) : '';
}

// House rule: no long dashes in text people see.
export function normalizeText(s) {
  return String(s).replace(/\s*\u2014\s*/g, ', ').replace(/\u2013/g, '-').replace(/\u2212/g, '-');
}

function headings(md) {
  return md.split('\n').filter((l) => /^#{1,3}\s/.test(l)).map((l) => l.replace(/^#+\s*/, '').trim());
}

// runTemplate(input, {outDir, exec?}) -> {outDir, files, cost_usd}
export async function runTemplate(input, opts = {}) {
  const { outDir } = opts;
  const exec = opts.exec || defaultExec;
  const { args } = planRun(input, outDir);
  const engineDir = args[args.indexOf('--out-dir') + 1];
  await mkdir(engineDir, { recursive: true });

  let res;
  try {
    res = await exec(args);
  } catch (e) {
    throw new Error(`engine failed to start: ${redactSecrets(e?.message || String(e))}`);
  }
  if (!res || typeof res.code !== 'number') throw new Error('engine failed: exec returned no exit code');
  if (res.code !== 0) {
    const why = lastLine(res.stderr) || lastLine(res.stdout) || 'no output';
    throw new Error(`engine failed with exit code ${res.code}: ${redactSecrets(why)}`);
  }

  const written = [];
  for (const f of await listFiles(engineDir)) {
    const body = await readFile(f, 'utf8');
    if (body.trim()) written.push({ path: f, rel: path.relative(engineDir, f), body });
  }
  if (!written.length) throw new Error(`engine wrote nothing: no non empty file in ${engineDir}`);

  const md = written.filter((w) => /\.(md|markdown|txt)$/i.test(w.rel));
  const parts = md.length ? md : written;
  let brief = parts.length === 1 ? parts[0].body.trim()
    : parts.map((w) => `<!-- ${w.rel} -->\n${w.body.trim()}`).join('\n\n');
  brief = normalizeText(brief);
  if (!/^#\s/m.test(brief)) brief = `# Research brief\n\n${brief}`;

  const cost_usd = input.sovereign === true ? 0 : parseCost(res.stdout || '');
  const words = brief.split(/\s+/).filter(Boolean).length;
  const meta = {
    template: 'research-brief-product',
    title: (brief.match(/^#\s+(.+)$/m) || [, 'Research brief'])[1].trim(),
    request: redactSecrets(input.brief.trim()),
    mode: input.sovereign === true ? 'sovereign' : 'cloud',
    sections: headings(brief),
    words,
    engine_files: written.map((w) => w.rel),
    model_calls: parseCalls(res.stdout || ''),
    cost_usd,
    generated_at: new Date().toISOString(),
  };

  await mkdir(outDir, { recursive: true });
  const mdPath = path.join(outDir, 'brief.md');
  const jsonPath = path.join(outDir, 'brief.json');
  await writeFile(mdPath, brief.endsWith('\n') ? brief : brief + '\n');
  await writeFile(jsonPath, JSON.stringify(meta, null, 2) + '\n');
  return { outDir, files: [mdPath, jsonPath], cost_usd };
}
