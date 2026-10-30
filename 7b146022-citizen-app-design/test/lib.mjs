import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
export const ROOT = resolve(import.meta.dirname, '..');
export const P = (p) => join(ROOT, p);
export const read = (p) => readFileSync(P(p), 'utf8');
export const SCREENS = ['first-run', 'lobby', 'chat', 'services', 'wallet', 'settings'];
export const PAGES = ['prototype/index.html', 'prototype/design-system.html', ...SCREENS.map((s) => `prototype/${s}.html`), ...SCREENS.map((s) => `prototype/ar/${s}.html`)];
export const tokens = () => JSON.parse(read('tokens/tokens.json'));

// WCAG 2 relative luminance and contrast ratio
const ch = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * ch(n >> 16) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255); };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** Local links of a page: [{attr, target (file path from ROOT), hash}] for href and src that are not external. */
export function localLinks(page) {
  const html = read(page); const out = [];
  for (const m of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    const v = m[2];
    if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue;
    const [path, hash] = v.split('#');
    const target = path ? relative(ROOT, resolve(dirname(P(page)), path)) : page;
    out.push({ attr: m[1], raw: v, target, hash: hash ?? null });
  }
  return out;
}
/** The text people see: tags, scripts and styles removed, entities decoded for the common ones. */
export const visibleText = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
export { existsSync };
