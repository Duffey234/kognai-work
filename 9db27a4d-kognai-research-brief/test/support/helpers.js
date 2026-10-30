import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
export const tmp = () => mkdtemp(path.join(tmpdir(), 'krb-'));
export const outDirOf = (args) => args[args.indexOf('--out-dir') + 1];
// A fake engine: writes files into --out-dir and prints the real footer shape.
export function fakeExec(files, { code = 0, cost = '0.0421', calls = 5, stderr = '' } = {}) {
  const seen = [];
  const exec = async (args) => {
    seen.push(args);
    const dir = outDirOf(args);
    for (const [rel, body] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await writeFile(path.join(dir, rel), body);
    }
    return { code, stdout: `   \u001b[90mTotal: 41.2s · ${calls} model calls · $${cost}\u001b[0m\n`, stderr };
  };
  exec.seen = seen;
  return exec;
}
