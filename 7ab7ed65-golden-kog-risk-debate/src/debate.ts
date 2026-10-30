// Golden Kog risk debate: two advocates argue a token's structure from measured facts, a reviewer weighs them.
// A risk tool, never a trading tool. Pattern adapted from TradingAgents (TauricResearch, Apache 2.0),
// without its trader or portfolio manager.
import { ADVOCATE_MAX_WORDS, REVIEWER_MAX_WORDS, problemsWith } from './rules.js';

export type Role = 'sound' | 'fragile' | 'reviewer';
export type Mode = 'off' | 'shadow' | 'on';

export interface DebateInput {
  facts_text: string;
  level: string;
  points: number;
  flag_ids: string[];
  unknown: string[];
}

export interface RouteArgs {
  task_type: 'risk_debate';
  tier_class: 'text';
  complexity: 'exec' | 'apex';
  context_tokens: number;
  constitutional_flag: false;
  agent_id: 'golden-kog';
  payload: { role: Role; system: string; prompt: string; max_tokens: number };
}

export interface RouteResult {
  content: string;
  model?: string;
  cost_usd?: number;
}

export interface DebateDeps {
  route(args: RouteArgs): Promise<RouteResult>;
  check?(text: string): string[];
  mode?: Mode;
  log?(row: object): void;
  timeoutMs?: number;
}

export interface Debate {
  status: 'ok' | 'rejected' | 'timeout' | 'off';
  shown: boolean;
  sound: string;
  fragile: string;
  reviewer: string;
  weight: string[];
  unknown: string[];
  tension?: string;
  models: { sound?: string; fragile?: string; reviewer?: string };
  usd: number;
  rejected: string[];
}

export const NO_CASE = 'No case could be written from the measured facts.';
export const DEFAULT_TIMEOUT_MS = 45000;
const ADVOCATE_MAX_TOKENS = 400;
const REVIEWER_MAX_TOKENS = 450;

const RULES_TEXT = [
  'Use only the measured facts given. Every number you write must appear in the facts exactly as written there.',
  'This is a risk analysis of the token structure, never a trading view: no buy, sell or hold view, no price target or price prediction, no entry or exit, no trade instruction, no advice.',
  'Never use these words: bull, bear, bullish, bearish, upside, downside target, undervalued, overvalued, accumulate, moon, buy now, sell now, price target, entry, exit, take profit, not financial advice.',
  'Use Latin digits only and no dash characters of any kind.',
].join(' ');

export const SYSTEM = {
  sound: `You are the advocate for a sound structure. Argue, from the measured facts only, why this token's structure holds up. ${RULES_TEXT} At most ${ADVOCATE_MAX_WORDS} words of plain prose.`,
  fragile: `You are the advocate for a fragile structure. Argue, from the measured facts only, why this token's structure could fail. ${RULES_TEXT} At most ${ADVOCATE_MAX_WORDS} words of plain prose.`,
  reviewer: `You are the reviewer. Weigh the two advocates against the measured facts and say which points carry the most weight and what stays unknown. ${RULES_TEXT} Answer only with JSON: {"text": string of at most ${REVIEWER_MAX_WORDS} words, "weight": array of the risk flag ids that carry the most weight, "unknown": array of short strings, "tension": optional string naming the main disagreement}.`,
} as const;

const tokensOf = (...parts: string[]) => Math.ceil(parts.reduce((n, p) => n + p.length, 0) / 4);

class Timeout extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Timeout(`call over ${ms} ms`)), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

function args(role: Role, prompt: string): RouteArgs {
  const system = SYSTEM[role];
  return {
    task_type: 'risk_debate',
    tier_class: 'text',
    complexity: role === 'reviewer' ? 'apex' : 'exec',
    context_tokens: tokensOf(system, prompt),
    constitutional_flag: false,
    agent_id: 'golden-kog',
    payload: { role, system, prompt, max_tokens: role === 'reviewer' ? REVIEWER_MAX_TOKENS : ADVOCATE_MAX_TOKENS },
  };
}

function factsPrompt(input: DebateInput): string {
  return [
    'Measured facts, one per line:',
    input.facts_text,
    '',
    `Risk flags that fired: ${input.flag_ids.length ? input.flag_ids.join(', ') : 'none'}`,
    `Known unknowns: ${input.unknown.length ? input.unknown.join('; ') : 'none'}`,
  ].join('\n');
}

// Accepts plain JSON or JSON inside one code fence.
function parseReviewer(content: string): { text: string; weight: string[]; unknown: string[]; tension?: string } | null {
  const fenced = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  let v: unknown;
  try {
    v = JSON.parse(fenced ? fenced[1] : content);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const strings = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === 'string');
  if (typeof o.text !== 'string' || !strings(o.weight) || !strings(o.unknown)) return null;
  if (o.tension !== undefined && typeof o.tension !== 'string') return null;
  return { text: o.text, weight: o.weight as string[], unknown: o.unknown as string[], tension: o.tension as string | undefined };
}

function blank(status: Debate['status'], shown: boolean): Debate {
  return { status, shown, sound: '', fragile: '', reviewer: '', weight: [], unknown: [], models: {}, usd: 0, rejected: [] };
}

export async function debate(input: DebateInput, deps: DebateDeps): Promise<Debate> {
  const mode: Mode = deps.mode ?? 'shadow';
  if (mode === 'off') return blank('off', false);
  const shown = mode === 'on';
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const out = blank('ok', shown);
  const facts = input.facts_text ?? '';
  const finish = (d: Debate) => {
    d.usd = Math.round(d.usd * 1e9) / 1e9; // no float noise in the cost
    if (deps.log) {
      try {
        deps.log({ kind: 'risk_debate', mode, ...d });
      } catch {
        // a failing logger never breaks the debate
      }
    }
    return d;
  };
  const call = async (role: Role, prompt: string) => {
    const r = await withTimeout(deps.route(args(role, prompt)), timeoutMs);
    if (typeof r?.cost_usd === 'number' && Number.isFinite(r.cost_usd)) out.usd += r.cost_usd;
    if (typeof r?.model === 'string') out.models[role] = r.model;
    return typeof r?.content === 'string' ? r.content : '';
  };
  const timedOut = () => {
    const d = blank('timeout', shown);
    d.usd = out.usd;
    d.models = out.models;
    d.rejected = [`a call took longer than ${timeoutMs} ms`];
    return finish(d);
  };

  // 1. The two advocates, in parallel.
  const base = factsPrompt(input);
  let texts: [string, string];
  try {
    const settled = await Promise.allSettled([
      call('sound', `${base}\n\nWrite the case for a sound structure.`),
      call('fragile', `${base}\n\nWrite the case for a fragile structure.`),
    ]);
    if (settled.some((s) => s.status === 'rejected' && s.reason instanceof Timeout)) return timedOut();
    texts = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value.trim();
      out.rejected.push(`${i === 0 ? 'sound' : 'fragile'}: call failed: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`);
      return '';
    }) as [string, string];
  } catch {
    return timedOut();
  }
  for (const [i, role] of (['sound', 'fragile'] as const).entries()) {
    const text = texts[i];
    const problems = text ? problemsWith(role, text, { factsText: facts, maxWords: ADVOCATE_MAX_WORDS, check: deps.check }) : out.rejected.some((r) => r.startsWith(role)) ? [] : [`${role}: empty text`];
    if (!text || problems.length) {
      out.rejected.push(...problems);
      out[role] = NO_CASE;
    } else {
      out[role] = text;
    }
  }

  // 2. The reviewer, with both advocate texts and the facts.
  let content: string;
  try {
    content = await call('reviewer', `${base}\n\nCase for a sound structure:\n${out.sound}\n\nCase for a fragile structure:\n${out.fragile}\n\nWeigh them.`);
  } catch (e) {
    if (e instanceof Timeout) return timedOut();
    return finish(rejectedDebate(out, [`reviewer: call failed: ${e instanceof Error ? e.message : String(e)}`]));
  }
  const parsed = parseReviewer(content);
  if (!parsed) return finish(rejectedDebate(out, ['reviewer: the answer is not the expected JSON']));
  const opts = { factsText: facts, maxWords: REVIEWER_MAX_WORDS, check: deps.check };
  const problems = [
    ...problemsWith('reviewer', parsed.text, opts),
    ...(parsed.tension !== undefined ? problemsWith('reviewer tension', parsed.tension, opts) : []),
  ];
  if (problems.length) return finish(rejectedDebate(out, problems));
  out.reviewer = parsed.text.trim();
  const flags = new Set(input.flag_ids);
  out.weight = [...new Set(parsed.weight.filter((id) => flags.has(id)))];
  out.unknown = [...new Set(parsed.unknown.map((s) => s.trim()).filter((s) => s && problemsWith('unknown', s, { factsText: facts, maxWords: 40, check: deps.check }).length === 0))];
  if (parsed.tension !== undefined && parsed.tension.trim()) out.tension = parsed.tension.trim();
  return finish(out);
}

function rejectedDebate(out: Debate, reasons: string[]): Debate {
  return { ...blank('rejected', out.shown), models: out.models, usd: out.usd, rejected: [...out.rejected, ...reasons] };
}
