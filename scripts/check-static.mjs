// Static sanity check for index.html and js/. No browser, no behaviour change.
// Catches the failures a refactor can cause silently: a corrupted index.html, a script tag pointing at a
// missing file, a js/ file nobody loads, duplicate tags, or a syntax error in any script.
// It does NOT test runtime behaviour (load order, login, tabs). That still needs a browser.
// Usage: node scripts/check-static.mjs [root]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.argv[2] || '.';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const fail = (m) => errors.push(m);

// 1. Document structure.
for (const t of ['</head>', '</body>', '</html>']) {
  const n = html.split(t).length - 1;
  if (n !== 1) fail(`index.html has ${n} occurrences of ${t} (expected 1)`);
}
const open = (html.match(/<script\b/gi) || []).length;
const close = (html.match(/<\/script>/gi) || []).length;
if (open !== close) fail(`unbalanced script tags: ${open} opening vs ${close} closing`);

// 2. Script tags: external vs inline.
const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const srcs = [];
const inline = [];
for (const m of tags) {
  const src = (m[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
  const type = (m[1].match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || 'classic';
  if (src) srcs.push({ src: src.split('?')[0], type });
  else inline.push({ type, body: m[2] });
}

// 3. Every local script exists; no duplicates; every js/ file is loaded.
const local = srcs.filter((s) => !/^(https?:)?\/\//.test(s.src));
const seen = new Set();
for (const s of local) {
  if (!fs.existsSync(path.join(root, s.src))) fail(`missing file referenced by index.html: ${s.src}`);
  if (seen.has(s.src)) fail(`script loaded twice: ${s.src}`);
  seen.add(s.src);
}
const jsDir = path.join(root, 'js');
const onDisk = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')) : [];
for (const f of onDisk) if (!seen.has('js/' + f)) fail(`js/${f} exists but index.html does not load it`);

// 4. Syntax check every local script, and every inline script.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-'));
const check = (file, label, asModule) => {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) fail(`syntax error in ${label}:\n${(r.stderr || '').split('\n').slice(0, 6).join('\n')}`);
};
for (const s of local) {
  const f = path.join(root, s.src);
  if (!fs.existsSync(f)) continue;
  if (s.type === 'module') { const t = path.join(tmp, 'm.mjs'); fs.copyFileSync(f, t); check(t, s.src, true); }
  else check(f, s.src, false);
}
inline.forEach((b, i) => {
  if (!b.body.trim()) return;
  const isModule = b.type === 'module';
  if (!isModule && /json|template|text\/(html|x)/i.test(b.type)) return;
  const t = path.join(tmp, `inline${i}.${isModule ? 'mjs' : 'js'}`);
  fs.writeFileSync(t, b.body);
  check(t, `inline <script type="${b.type}"> #${i + 1}`, isModule);
});
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`scripts: ${local.length} external, ${inline.length} inline; js/ files on disk: ${onDisk.length}`);
if (errors.length) {
  console.error(`\nFAILED (${errors.length}):`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('OK: index.html structure, script references and syntax all check out.');
