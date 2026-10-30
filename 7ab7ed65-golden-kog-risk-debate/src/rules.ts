// The rules every debate part must pass. Pure functions, no dependency.

export const REFUSED_TERMS = [
  'bull', 'bear', 'bullish', 'bearish', 'upside', 'downside target', 'undervalued', 'overvalued',
  'accumulate', 'moon', 'buy now', 'sell now', 'price target', 'entry', 'exit', 'take profit',
  'not financial advice',
] as const;

// Stricter than the job list, on by default: phrases that would make a part a buy, sell or hold signal,
// a price prediction or a trade instruction. Plain risk words such as "holders" or "sell pressure" pass.
export const TRADE_SIGNAL_TERMS = [
  'strong buy', 'strong sell', 'buy signal', 'sell signal', 'hold signal', 'buy rating', 'sell rating', 'hold rating',
  'should buy', 'should sell', 'should hold', 'worth buying', 'time to buy', 'time to sell', 'buy the dip',
  'price prediction', 'price forecast', 'target price', 'price will', 'will pump', 'will dump',
  'go long', 'go short', 'long position', 'short position', 'stop loss', 'entry point', 'exit point',
] as const;

export const ADVOCATE_MAX_WORDS = 180;
export const REVIEWER_MAX_WORDS = 150;

// A number is a run of Latin digits, optionally with inner separators: 12, 0.45, 1,250. Digits glued to a
// letter or underscore belong to an identifier (top10_holders) and are not numbers.
const NUMBER_RE = /(?<![\p{L}\p{N}_.,])[0-9]+(?:[.,][0-9]+)*/gu;
// Any decimal digit that is not 0 to 9 (Arabic Indic, Devanagari, full width and so on).
const NON_LATIN_DIGIT_RE = /(?![0-9])\p{Nd}/u;
// Any dash punctuation: hyphen minus, hyphen, figure dash, en dash, em dash, minus sign and the rest.
const DASH_RE = /[\p{Pd}\u2212]/u;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const termRe = (t: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
const TERM_RES = REFUSED_TERMS.map((t) => ({ term: t, re: termRe(t) }));
const SIGNAL_RES = TRADE_SIGNAL_TERMS.map((t) => ({ term: t, re: termRe(t) }));

export function numbersIn(text: string): string[] {
  return text.match(NUMBER_RE) ?? [];
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/u).length : 0;
}

export interface RuleOptions {
  factsText: string;
  maxWords: number;
  check?: (text: string) => string[];
}

// Returns the problems with one part; an empty array means the part is fine.
export function problemsWith(label: string, text: string, opts: RuleOptions): string[] {
  const out: string[] = [];
  if (typeof text !== 'string' || !text.trim()) return [`${label}: empty text`];
  const known = new Set(numbersIn(opts.factsText));
  const unknownNumbers = [...new Set(numbersIn(text).filter((n) => !known.has(n)))];
  if (unknownNumbers.length) out.push(`${label}: numbers not in the measured facts: ${unknownNumbers.join(' ')}`);
  for (const { term, re } of TERM_RES) if (re.test(text)) out.push(`${label}: refused term "${term}"`);
  for (const { term, re } of SIGNAL_RES) if (re.test(text)) out.push(`${label}: refused term "${term}" (trade signal or price prediction)`);
  if (DASH_RE.test(text)) out.push(`${label}: dash character`);
  if (NON_LATIN_DIGIT_RE.test(text)) out.push(`${label}: non Latin digit`);
  const words = wordCount(text);
  if (words > opts.maxWords) out.push(`${label}: ${words} words, over ${opts.maxWords}`);
  if (opts.check) {
    let extra: unknown;
    try {
      extra = opts.check(text);
    } catch (e) {
      extra = [`check failed: ${e instanceof Error ? e.message : String(e)}`];
    }
    if (Array.isArray(extra)) for (const p of extra) if (typeof p === 'string' && p) out.push(`${label}: ${p}`);
  }
  return out;
}
