// Prints one Debate made with a canned route (no model, no network): npx tsx examples/example.ts
import { debate } from '../src/debate.js';

const facts_text = [
  'Top 10 holders own 41.5% of supply.',
  'Liquidity pool holds 182,400 USDC, locked for 365 days.',
  'Mint authority is revoked.',
  'Creator wallet holds 3.2% of supply.',
  'Token age is 47 days.',
].join('\n');

const canned: Record<string, { content: string; model: string; cost_usd: number }> = {
  sound: { content: 'Mint authority is revoked, so supply cannot grow. Liquidity of 182,400 USDC is locked for 365 days, which keeps the pool in place. The creator wallet holds only 3.2% of supply.', model: 'exec-model', cost_usd: 0.0011 },
  fragile: { content: 'The top 10 holders own 41.5% of supply, so a few wallets could drain the pool depth quickly. At 47 days the token has a short record.', model: 'exec-model', cost_usd: 0.0009 },
  reviewer: { content: JSON.stringify({ text: 'The revoked mint and the locked pool carry real weight. The main structural risk is that 41.5% sits with the top 10 holders while the token is 47 days old.', weight: ['top10_concentration', 'young_token', 'made_up_flag'], unknown: ['team identity'], tension: 'Locked liquidity against concentrated holdings.' }), model: 'apex-model', cost_usd: 0.0042 },
};

const d = await debate(
  { facts_text, level: 'medium', points: 42, flag_ids: ['top10_concentration', 'young_token'], unknown: ['team identity'] },
  { route: async (a) => canned[a.payload.role], mode: 'on' },
);
console.log(JSON.stringify(d, null, 2));
