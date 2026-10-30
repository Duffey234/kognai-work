import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTemplate } from '../src/index.js';
import { tmp, fakeExec } from './support/helpers.js';

test('A4 an engine failure is rejected with a plain reason', async () => {
  const exec = fakeExec({}, { code: 2, stderr: 'error: ANTHROPIC_API_KEY not set\n' });
  await assert.rejects(runTemplate({ brief: 'x' }, { outDir: await tmp(), exec }), /engine failed with exit code 2: error: ANTHROPIC_API_KEY not set/);
});

test('A4 an exec that throws is rejected with a plain reason', async () => {
  const exec = async () => { throw new Error('spawn npx ENOENT'); };
  await assert.rejects(runTemplate({ brief: 'x' }, { outDir: await tmp(), exec }), /engine failed to start: spawn npx ENOENT/);
});

test('A4 an empty output is rejected with a plain reason', async () => {
  await assert.rejects(runTemplate({ brief: 'x' }, { outDir: await tmp(), exec: fakeExec({}) }), /engine wrote nothing/);
  await assert.rejects(runTemplate({ brief: 'x' }, { outDir: await tmp(), exec: fakeExec({ 'brief.md': '  \n' }) }), /engine wrote nothing/);
});

test('A4 a failure reason never echoes a key', async () => {
  const exec = fakeExec({}, { code: 1, stderr: 'bad key sk-ant-api03-SECRETSECRETSECRET\n' });
  await assert.rejects(runTemplate({ brief: 'x' }, { outDir: await tmp(), exec }), (e) => !e.message.includes('SECRETSECRET'));
});
