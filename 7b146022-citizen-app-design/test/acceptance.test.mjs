import test from 'node:test';
import assert from 'node:assert/strict';
import { read, P, PAGES, SCREENS, tokens, contrast, localLinks, visibleText, existsSync } from './lib.mjs';

const REQUIRED = ['bg', 'surface', 'text', 'text-muted', 'primary', 'on-primary', 'border', 'danger'];
const PAIRS = [['text', 'bg'], ['text-muted', 'bg'], ['text', 'surface'], ['text-muted', 'surface'], ['on-primary', 'primary'], ['danger', 'bg']];
// pairs the components also use: link and active nav colour, chips, danger buttons on surface, muted on the second surface
const EXTRA = [['primary', 'bg'], ['primary', 'surface'], ['text', 'surface-2'], ['text-muted', 'surface-2'], ['danger', 'surface']];

test('A1 the tokens cover both themes, and every text pair has a contrast of at least 4.5 to 1 in light and in dark', () => {
  const t = tokens();
  for (const theme of ['light', 'dark']) {
    for (const k of REQUIRED) assert.match(t.color[theme][k] ?? '', /^#[0-9a-f]{6}$/i, `${theme}.${k} as #rrggbb`);
    for (const [fg, bg] of [...PAIRS, ...EXTRA]) {
      const c = contrast(t.color[theme][fg], t.color[theme][bg]);
      assert.ok(c >= 4.5, `${theme}: ${fg} on ${bg} is ${c.toFixed(2)} to 1`);
    }
    assert.ok(contrast(t.color[theme].focus, t.color[theme].bg) >= 3, `${theme}: focus ring visible`);
  }
  for (const k of ['type', 'space', 'radius']) assert.ok(Object.keys(t[k]).length > 0, k);
  // brand: terracotta primary, charcoal text in light, cream background in light
  const L = t.color.light; const hue = (h) => { const n = parseInt(h.slice(1), 16); const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255]; return { r, g, b }; };
  const p = hue(L.primary); assert.ok(p.r > p.g && p.g > p.b, 'primary is a terracotta (red over green over blue)');
  const bg = hue(L.bg); assert.ok(bg.r >= bg.g && bg.g >= bg.b && bg.b > 220, 'light background is a cream');
});

test('A1 tokens.css holds the same values: light by default, dark under prefers-color-scheme and [data-theme="dark"]', () => {
  const css = read('tokens/tokens.css'); const t = tokens();
  const block = (re) => (css.match(re) ?? [])[1] ?? '';
  const root = block(/^:root \{([\s\S]*?)\n\}/m);
  const media = block(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}\n/);
  const dark = block(/^\[data-theme="dark"\] \{([\s\S]*?)\n\}/m);
  for (const [k, v] of Object.entries(t.color.light)) assert.ok(root.includes(`--color-${k}: ${v};`), `light ${k}`);
  for (const [k, v] of Object.entries(t.color.dark)) { assert.ok(media.includes(`--color-${k}: ${v};`), `media dark ${k}`); assert.ok(dark.includes(`--color-${k}: ${v};`), `data-theme dark ${k}`); }
  for (const [k, v] of Object.entries(t.space)) assert.ok(root.includes(`--space-${k}: ${v};`));
  for (const [k, v] of Object.entries(t.radius)) assert.ok(root.includes(`--radius-${k}: ${v};`));
});

test('A2 every screen exists in English and in Arabic, the Arabic screens flowing right to left', () => {
  for (const s of SCREENS) {
    assert.ok(existsSync(P(`prototype/${s}.html`)), `${s} en`);
    const ar = read(`prototype/ar/${s}.html`);
    assert.match(ar, /<html lang="ar" dir="rtl">/, `${s} ar is lang ar, dir rtl`);
    assert.match(read(`prototype/${s}.html`), /<html lang="en" dir="ltr">/);
    assert.match(visibleText(ar), /[\u0600-\u06FF]{3,}/, `${s} ar is written in Arabic`);
    // the two versions are the same screen: same controls
    const ids = (h) => [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(ids(ar), ids(read(`prototype/${s}.html`)), `${s}: same controls in both languages`);
  }
  // the components use logical properties so the layout mirrors in rtl
  const css = read('prototype/assets/app.css');
  assert.doesNotMatch(css, /margin-left|margin-right|padding-left|padding-right|\bleft:|\bright:|text-align:\s*(left|right)/, 'no physical left or right in components');
});

test('A3 every screen works at phone width with the tokens: viewport meta, tokens.css, no fixed width over 360 px', () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1">/, `${p} viewport`);
    assert.ok(localLinks(p).some((l) => l.target === 'tokens/tokens.css'), `${p} links tokens.css`);
    assert.ok(localLinks(p).some((l) => l.target === 'prototype/assets/app.css'), `${p} links the components`);
    if (!p.endsWith('design-system.html')) for (const m of h.matchAll(/style="([^"]*)"/g)) assert.doesNotMatch(m[1], /#[0-9a-f]{3,6}\b|rgb\(/i, `${p}: inline colour`);
  }
  const css = read('prototype/assets/app.css');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i, 'every colour in the components comes from a token');
  for (const m of css.matchAll(/(?:^|[;{])\s*(min-)?width:\s*(\d+)px/g)) assert.ok(Number(m[2]) <= 360, `fixed width ${m[2]}px`);
  assert.match(css, /max-width:480px/); // phone first column, fluid below
});

test('A4 the prototype is clickable: every screen is reachable from index.html and no local link is broken', () => {
  const seen = new Set(['prototype/index.html']); const queue = ['prototype/index.html'];
  while (queue.length) {
    const p = queue.shift();
    for (const l of localLinks(p)) {
      assert.ok(existsSync(P(l.target)), `${p} links ${l.raw}: missing`);
      if (l.hash) assert.match(read(l.target), new RegExp(`id="${l.hash}"`), `${p} links ${l.raw}: no such anchor`);
      if (l.attr === 'href' && l.target.endsWith('.html') && !seen.has(l.target)) { seen.add(l.target); queue.push(l.target); }
    }
  }
  for (const p of PAGES) assert.ok(seen.has(p), `${p} reachable from index.html`);
  // every screen links to the screens it leads to: the bottom nav on the five main screens, first run to the lobby
  for (const dir of ['', 'ar/']) {
    assert.ok(localLinks(`prototype/${dir}first-run.html`).some((l) => l.target === `prototype/${dir}lobby.html`));
    for (const s of SCREENS.filter((x) => x !== 'first-run')) for (const t of ['lobby', 'chat', 'services', 'wallet', 'settings']) assert.ok(localLinks(`prototype/${dir}${s}.html`).some((l) => l.target === `prototype/${dir}${t}.html`), `${dir}${s} -> ${t}`);
  }
});

test('A5 accessible: images have alt text, controls have labels, every page sets its language', () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /<html lang="(en|ar)"/, `${p} lang`);
    for (const m of h.matchAll(/<img\b[^>]*>/g)) assert.match(m[0], /\salt="[^"]{3,}"/, `${p}: ${m[0]}`);
    for (const m of h.matchAll(/<(input|select|textarea)\b[^>]*\bid="([^"]+)"[^>]*>/g)) assert.match(h, new RegExp(`<label for="${m[2]}">[^<]{2,}</label>`), `${p}: ${m[2]} has a label`);
    for (const m of h.matchAll(/<(input|select|textarea)\b(?![^>]*\bid=)[^>]*>/g)) assert.fail(`${p}: a control without an id and label: ${m[0]}`);
    for (const m of h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) assert.ok(m[1].replace(/<[^>]+>/g, '').trim().length > 0, `${p}: a button has text`);
    for (const m of h.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) assert.ok(m[1].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim().length > 0 || /aria-label=/.test(m[0]), `${p}: a link has text`);
    for (const m of h.matchAll(/<svg\b[^>]*>/g)) assert.ok(/aria-hidden="true"/.test(m[0]) || /role="img"/.test(m[0]), `${p}: decorative icons are hidden`);
    assert.match(h, /<main id="main">/); assert.match(h, /class="skip" href="#main"/);
    assert.match(h, /<title>[^<]{3,}<\/title>/);
  }
  assert.match(read('prototype/assets/citizen.svg'), /<title[^>]*>[^<]+<\/title>/);
});

test('A5 text people see: Latin digits only, also in Arabic, and no long dashes', () => {
  for (const p of [...PAGES, 'README.md', 'docs/REVIEW.md']) {
    const t = p.endsWith('.html') ? visibleText(read(p)) : read(p);
    assert.doesNotMatch(t, /[\u0660-\u0669\u06F0-\u06F9]/, `${p}: Arabic Indic digits`);
    assert.doesNotMatch(t, /[\u2013\u2014\u2015]/, `${p}: long dash`);
  }
});

test('A6 the review by the Founder with three test users has its script and record sheet ready', { todo: 'run by Kognai at M2' }, () => {
  const r = read('docs/REVIEW.md');
  for (const k of ['Founder', 'Test user 1', 'Test user 2', 'Test user 3']) assert.ok(r.includes(k));
  assert.fail('the review itself happens at M2 with the Founder');
});
