// Tests named after the acceptance items A1 to A7. A fake route answers every call; nothing touches a network.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { debate, NO_CASE, type DebateInput, type RouteArgs, type RouteResult, type Debate } from '../src/debate.js';
import { problemsWith, numbersIn, TRADE_SIGNAL_TERMS } from '../src/rules.js';

const FACTS = [
  'Top 10 holders own 41.5% of supply.',
  'Liquidity pool holds 182,400 USDC, locked for 365 days.',
  'Mint authority is revoked.',
  'Creator wallet holds 3.2% of supply.',
  'Token age is 47 days.',
].join('\n');

const INPUT: DebateInput = { facts_text: FACTS, level: 'medium', points: 42, flag_ids: ['top10_concentration', 'young_token'], unknown: ['team identity'] };

const SOUND = 'Mint authority is revoked, so supply cannot grow. Liquidity of 182,400 USDC is locked for 365 days, which keeps the pool in place. The creator wallet holds only 3.2% of supply.';
const FRAGILE = 'The top 10 holders own 41.5% of supply, so a few wallets could move the pool. At 47 days the token has a short record, and the team identity is not known.';
const REVIEW = { text: 'The locked pool and the revoked mint carry real weight, but 41.5% held by the top 10 is the main structural risk while the token is 47 days old.', weight: ['top10_concentration', 'not_a_flag'], unknown: ['team identity'], tension: 'Locked liquidity against concentrated holdings.' };

type Answer = RouteResult | Error | (() => Promise<RouteResult>);
function fakeRoute(answers: Partial<Record<'sound' | 'fragile' | 'reviewer', Answer>>) {
  const calls: RouteArgs[] = [];
  const events: string[] = [];
  const defaults: Record<string, RouteResult> = {
    sound: { content: SOUND, model: 'm-exec', cost_usd: 0.001 },
    fragile: { content: FRAGILE, model: 'm-exec', cost_usd: 0.002 },
    reviewer: { content: JSON.stringify(REVIEW), model: 'm-apex', cost_usd: 0.004 },
  };
  const route = async (args: RouteArgs): Promise<RouteResult> => {
    calls.push(args);
    const role = args.payload.role;
    events.push(`start:${role}`);
    const a = answers[role] ?? defaults[role];
    await new Promise((r) => setTimeout(r, role === 'sound' ? 15 : 5));
    events.push(`end:${role}`);
    if (a instanceof Error) throw a;
    if (typeof a === 'function') return a();
    return a;
  };
  return { route, calls, events };
}

test('A1 the advocates run in parallel as sound and fragile, then the reviewer gets both texts and the facts', async () => {
  const f = fakeRoute({});
  const d = await debate(INPUT, { route: f.route, mode: 'on' });
  assert.equal(d.status, 'ok', d.rejected.join('; '));
  assert.deepEqual(f.calls.map((c) => c.payload.role), ['sound', 'fragile', 'reviewer']);
  // both advocates started before either ended: parallel
  assert.deepEqual(f.events.slice(0, 2).sort(), ['start:fragile', 'start:sound']);
  assert.ok(f.events.indexOf('start:reviewer') > f.events.indexOf('end:sound'));
  for (const c of f.calls) {
    assert.equal(c.task_type, 'risk_debate');
    assert.equal(c.tier_class, 'text');
    assert.equal(c.constitutional_flag, false);
    assert.equal(c.agent_id, 'golden-kog');
    assert.ok(c.context_tokens > 0 && Number.isInteger(c.context_tokens));
    assert.ok(c.payload.max_tokens > 0);
    assert.ok(c.payload.prompt.includes(FACTS));
  }
  assert.deepEqual(f.calls.map((c) => c.complexity), ['exec', 'exec', 'apex']);
  const reviewerPrompt = f.calls[2].payload.prompt;
  assert.ok(reviewerPrompt.includes(SOUND) && reviewerPrompt.includes(FRAGILE));
  assert.equal(d.sound, SOUND);
  assert.equal(d.fragile, FRAGILE);
  assert.equal(d.reviewer, REVIEW.text);
  assert.deepEqual(d.models, { sound: 'm-exec', fragile: 'm-exec', reviewer: 'm-apex' });
  assert.equal(d.tension, REVIEW.tension);
  assert.ok(!('level' in d) && !('points' in d));
});

test('A2 a number not in facts_text replaces the advocate part, or drops the debate for the reviewer, with the reason kept', async () => {
  const f = fakeRoute({ sound: { content: 'Liquidity of 500,000 USDC is locked for 365 days.' } });
  const d = await debate(INPUT, { route: f.route });
  assert.equal(d.status, 'ok');
  assert.equal(d.sound, NO_CASE);
  assert.equal(d.fragile, FRAGILE);
  assert.ok(d.rejected.some((r) => r.startsWith('sound:') && r.includes('500,000')), d.rejected.join('; '));
  // the reviewer saw the replacement, not the bad text
  assert.ok(f.calls[2].payload.prompt.includes(NO_CASE));
  assert.ok(!f.calls[2].payload.prompt.includes('500,000'));

  const g = fakeRoute({ reviewer: { content: JSON.stringify({ ...REVIEW, text: 'The top 10 hold 52% of supply.' }) } });
  const r = await debate(INPUT, { route: g.route });
  assert.equal(r.status, 'rejected');
  assert.equal(r.sound, '');
  assert.equal(r.fragile, '');
  assert.equal(r.reviewer, '');
  assert.ok(r.rejected.some((x) => x.startsWith('reviewer:') && x.includes('52')));
  // numbers written another way do not count as the same number
  assert.ok(problemsWith('x', 'Liquidity is 182400 USDC.', { factsText: FACTS, maxWords: 180 }).length > 0);
  assert.deepEqual(numbersIn('top10_concentration fired at 41.5%.'), ['41.5']);
});

test('A3 a refused word, a long dash, a non Latin digit, too many words or a check problem is refused the same way', async () => {
  const bad: Array<[string, RegExp]> = [
    ['The structure looks bullish with 47 days of history.', /refused term "bullish"/],
    ['A clear price target cannot be set from 47 days.', /refused term "price target"/],
    ['Holders could Take  Profit at any time.', /refused term "take profit"/],
    ['Mint authority is revoked \u2014 supply is fixed.', /dash character/],
    ['Token age is \u0664\u0667 days.', /non Latin digit/],
    [Array.from({ length: 181 }, () => 'word').join(' '), /181 words, over 180/],
    ['Mint authority is revoked.', /guard: says no/],
  ];
  for (const [text, why] of bad) {
    const check = text === 'Mint authority is revoked.' ? (t: string) => (t === text ? ['guard: says no'] : []) : undefined;
    const d = await debate(INPUT, { route: fakeRoute({ fragile: { content: text } }).route, check });
    assert.equal(d.fragile, NO_CASE, text);
    assert.ok(d.rejected.some((r) => r.startsWith('fragile:') && why.test(r)), `${text}: ${d.rejected.join('; ')}`);
    const r = await debate(INPUT, { route: fakeRoute({ reviewer: { content: JSON.stringify({ ...REVIEW, text }) } }).route, check: check ? (t) => (t === text ? ['guard: says no'] : []) : undefined });
    assert.equal(r.status, 'rejected', text);
    assert.ok(r.rejected.some((x) => x.startsWith('reviewer:') && (why.test(x) || /150/.test(x))), `${text}: ${r.rejected.join('; ')}`);
  }
  // words inside other words are fine: "bearing", "exiting" are not refused terms; the reviewer limit is 150
  assert.deepEqual(problemsWith('x', 'Load bearing liquidity, re entry free.', { factsText: FACTS, maxWords: 180 }), ['x: refused term "entry"']);
  assert.deepEqual(problemsWith('x', 'Load bearing liquidity.', { factsText: FACTS, maxWords: 180 }), []);
  const long = Array.from({ length: 151 }, () => 'word').join(' ');
  const r = await debate(INPUT, { route: fakeRoute({ reviewer: { content: JSON.stringify({ ...REVIEW, text: long }) } }).route });
  assert.ok(r.rejected.some((x) => /151 words, over 150/.test(x)));
});

test('A4 the reviewer JSON is parsed, weight keeps only known flag ids, unparseable JSON gives status rejected', async () => {
  const d = await debate(INPUT, { route: fakeRoute({}).route });
  assert.deepEqual(d.weight, ['top10_concentration']);
  assert.deepEqual(d.unknown, ['team identity']);
  const fenced = await debate(INPUT, { route: fakeRoute({ reviewer: { content: '```json\n' + JSON.stringify(REVIEW) + '\n```' } }).route });
  assert.equal(fenced.status, 'ok');
  for (const content of ['not json', '{"text": 5}', '[]', JSON.stringify({ text: 'ok', weight: 'x', unknown: [] }), '']) {
    const r = await debate(INPUT, { route: fakeRoute({ reviewer: { content } }).route });
    assert.equal(r.status, 'rejected', content);
    assert.deepEqual([r.sound, r.fragile, r.reviewer], ['', '', '']);
    assert.ok(r.rejected.some((x) => /not the expected JSON/.test(x)));
  }
});

test('A5 a call over timeoutMs gives status timeout, without throwing', async () => {
  const slow = () => new Promise<RouteResult>((r) => setTimeout(() => r({ content: SOUND }), 200));
  const d = await debate(INPUT, { route: fakeRoute({ fragile: slow }).route, timeoutMs: 50, mode: 'on' });
  assert.equal(d.status, 'timeout');
  assert.equal(d.shown, true);
  assert.deepEqual([d.sound, d.fragile, d.reviewer], ['', '', '']);
  const r = await debate(INPUT, { route: fakeRoute({ reviewer: slow }).route, timeoutMs: 50 });
  assert.equal(r.status, 'timeout');
  assert.ok(r.usd > 0); // the advocate calls that did finish are still counted
});

test('A6 mode off makes no call; shadow logs and returns shown false; on returns shown true; usd sums the calls', async () => {
  const off = fakeRoute({});
  const rows: object[] = [];
  const d0 = await debate(INPUT, { route: off.route, mode: 'off', log: (r) => rows.push(r) });
  assert.equal(d0.status, 'off');
  assert.equal(d0.shown, false);
  assert.equal(off.calls.length, 0);
  assert.equal(rows.length, 0);

  const d1 = await debate(INPUT, { route: fakeRoute({}).route, log: (r) => rows.push(r) }); // default is shadow
  assert.equal(d1.status, 'ok');
  assert.equal(d1.shown, false);
  assert.equal(rows.length, 1);
  assert.equal((rows[0] as Debate).reviewer, REVIEW.text);

  const d2 = await debate(INPUT, { route: fakeRoute({}).route, mode: 'on' });
  assert.equal(d2.shown, true);
  assert.ok(Math.abs(d2.usd - 0.007) < 1e-12);
  const d3 = await debate(INPUT, { route: fakeRoute({}).route, mode: 'shadow', log: () => { throw new Error('log down'); } });
  assert.equal(d3.status, 'ok');
});

test('A7 the README shows the call flow, the rules, an example Debate and credits TradingAgents', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /## Call flow/);
  assert.match(readme, /## Rules/);
  assert.match(readme, /## Example Debate/);
  assert.match(readme, /"status": "ok"/);
  assert.match(readme, /TradingAgents/);
  assert.match(readme, /TauricResearch/);
  assert.match(readme, /Apache 2\.0/);
  assert.match(readme, /Not financial advice/);
  assert.doesNotMatch(readme, /[\u2013\u2014]/);
});

test('A3 strict risk only: buy, sell or hold signals, price predictions and trade instructions are refused too', async () => {
  const signals: Array<[string, string]> = [
    ['On these facts this is a strong buy for 47 days.', 'strong buy'],
    ['The reviewer gives it a hold rating.', 'hold rating'],
    ['Holders should sell before 365 days pass.', 'should sell'],
    ['The price will fall as the 41.5% unlocks.', 'price will'],
    ['A stop loss under the pool is wise.', 'stop loss'],
    ['Traders could go short on this structure.', 'go short'],
  ];
  for (const [text, term] of signals) {
    const d = await debate(INPUT, { route: fakeRoute({ sound: { content: text } }).route });
    assert.equal(d.sound, NO_CASE, text);
    assert.ok(d.rejected.some((r) => r.startsWith('sound:') && r.includes(`refused term "${term}"`)), `${text}: ${d.rejected.join('; ')}`);
  }
  // plain risk language about holders and sell pressure still passes
  assert.deepEqual(problemsWith('x', 'The top 10 holders hold 41.5% of supply, so sell pressure from a few wallets could drain the pool.', { factsText: FACTS, maxWords: 180 }), []);
  // the module has no trade path at all: nothing in src names a wallet, a swap, an order or a network call
  for (const f of ['debate.ts', 'rules.ts']) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b(fetch|swap|sendTransaction|signTransaction|placeOrder|privateKey)\b/, f);
  }
  assert.ok(TRADE_SIGNAL_TERMS.length >= 20);
});
