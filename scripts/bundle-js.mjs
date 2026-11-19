// Build-time JS bundler for GitHub Pages. Merges runs of adjacent local <script src="js/..."> tags into one file.
// Order-preserving and timing-preserving: scripts are only merged when nothing but whitespace sits between
// their tags, so each one runs at exactly the same point in HTML parsing as before.
// A file is left out of any bundle (stays a separate tag) if it uses document.currentScript, starts with
// 'use strict', fails to compile on its own, has attributes other than id/src, or its tag id is referenced
// anywhere else. A run that fails to compile as a whole is left unbundled.
// Source files in the repo are never modified; this runs on the dist/ copy. Real errors throw, and the
// workflow then keeps the CSS-only build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const dist = process.argv[2] || 'dist';
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const comments = [...html.matchAll(/<!--[\s\S]*?-->/g)].map((m) => [m.index, m.index + m[0].length]);
const inComment = (i) => comments.some(([a, b]) => i >= a && i < b);

// All JS text, used to detect references to a script tag's id.
const jsDir = path.join(dist, 'js');
const allJs = fs.existsSync(jsDir)
  ? fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n')
  : '';
const haystack = html + '\n' + allJs;
const countOf = (s) => { let n = 0, i = -1; while ((i = haystack.indexOf(s, i + 1)) !== -1) n++; return n; };

const USE_STRICT = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use strict['"]/;
const els = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (inComment(m.index)) continue;
  const attrs = m[1];
  const body = m[2];
  const names = [...attrs.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*(?:=|(?=\s|$))/g)].map((x) => x[1].toLowerCase());
  const src = (attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
  const id = (attrs.match(/\bid\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
  let ok = !!src && body.trim() === '' && names.every((n) => n === 'src' || n === 'id') && /^js\/[A-Za-z0-9._-]+\.js$/.test(src);
  let code = '';
  let why = '';
  if (ok) {
    const file = path.join(dist, src);
    if (!fs.existsSync(file)) throw new Error('missing js file ' + src);
    code = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    if (/currentScript/.test(code)) { ok = false; why = 'uses currentScript'; }
    else if (USE_STRICT.test(code)) { ok = false; why = 'use strict'; }
    else if (id && countOf(id) > 1) { ok = false; why = 'tag id referenced'; }
    else { try { new vm.Script(code, { filename: src }); } catch (e) { ok = false; why = 'does not compile alone'; } }
  }
  if (!ok && src && why) console.log('keep separate:', src, '(' + why + ')');
  els.push({ pos: m.index, end: m.index + m[0].length, ok, src, code });
}

// Group consecutive mergeable scripts separated by whitespace only.
const groups = []; let cur = [];
for (let i = 0; i < els.length; i++) {
  const e = els[i];
  const prev = cur[cur.length - 1];
  if (e.ok && prev && html.slice(prev.end, e.pos).trim() === '') cur.push(e);
  else { if (cur.length) groups.push(cur); cur = e.ok ? [e] : []; }
}
if (cur.length) groups.push(cur);

const edits = [];
let n = 0, removed = 0;
for (const g of groups) {
  if (g.length < 2) continue;
  let bundle = '';
  for (const e of g) bundle += '/* ==== ' + e.src + ' ==== */\n' + e.code + (e.code.endsWith('\n') ? '' : '\n') + ';\n';
  const hash = crypto.createHash('sha1').update(bundle).digest('hex').slice(0, 10);
  const name = 'js/bundle-' + (n + 1) + '-' + hash + '.js';
  try { new vm.Script(bundle, { filename: name }); }
  catch (e) { console.log('skip run (does not compile as a whole):', g.map((x) => x.src).join(', '), '-', e.message); continue; }
  n++;
  fs.writeFileSync(path.join(dist, name), bundle);
  edits.push({ pos: g[0].pos, end: g[0].end, text: '<script src="' + name + '"></script>' });
  for (const e of g.slice(1)) edits.push({ pos: e.pos, end: e.end, text: '' });
  removed += g.length - 1;
  console.log('bundle', name, 'from', g.length, 'files,', bundle.length, 'bytes');
}
if (!edits.length) { console.log('nothing to bundle'); process.exit(0); }
edits.sort((a, b) => b.pos - a.pos);
const origLen = html.length;
for (const e of edits) html = html.slice(0, e.pos) + e.text + html.slice(e.end);

if (!html.includes('</head>') || !html.includes('</body>') || !html.includes('</html>')) throw new Error('document structure lost');
const before = els.length;
const after = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].filter((m) => !inComment(m.index)).length;
if (after !== before - removed) throw new Error('script count mismatch: ' + before + ' -> ' + after + ', expected ' + (before - removed));
fs.writeFileSync(indexPath, html);
console.log('ok: ' + before + ' -> ' + after + ' script tags; index.html', origLen, '->', html.length, 'bytes');
