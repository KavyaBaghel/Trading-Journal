// Build-time CSS bundler for GitHub Pages. Merges runs of adjacent local stylesheet <link> tags into one file.
// Order-preserving: two links are only merged when no <style> block or other stylesheet sits between them,
// so the cascade is identical. Source files in the repo are never modified; this runs on the dist/ copy.
// Any anomaly throws, and the workflow then publishes the unmodified site instead.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dist = process.argv[2] || 'dist';
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const origLen = html.length;

// Ranges where tag-looking text is NOT real markup (scripts, comments, existing style blocks' bodies).
const dead = [];
for (const m of html.matchAll(/<!--[\s\S]*?-->/g)) dead.push([m.index, m.index + m[0].length]);
for (const m of html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) dead.push([m.index, m.index + m[0].length]);
const inDead = (i) => dead.some(([a, b]) => i >= a && i < b);

const events = []; // {pos,end,type:'merge'|'barrier'|'preload', href}
for (const m of html.matchAll(/<style\b[\s\S]*?<\/style>/gi)) {
  if (!inDead(m.index)) events.push({ pos: m.index, end: m.index + m[0].length, type: 'barrier' });
}
for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
  if (inDead(m.index)) continue;
  const tag = m[0];
  const rel = (tag.match(/\brel\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '';
  const href = (tag.match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
  const local = /^css\/[A-Za-z0-9._-]+\.css(\?[^"']*)?$/.test(href);
  if (rel.toLowerCase() === 'stylesheet') {
    const plain = !/\b(media|integrity|crossorigin|disabled|title|onload|as)\s*=/i.test(tag) && !/\bdisabled\b/i.test(tag);
    events.push({ pos: m.index, end: m.index + tag.length, type: local && plain ? 'merge' : 'barrier', href: href.split('?')[0] });
  } else if (rel.toLowerCase() === 'preload' && local) {
    events.push({ pos: m.index, end: m.index + tag.length, type: 'preload', href: href.split('?')[0] });
  }
}
events.sort((a, b) => a.pos - b.pos);

// Group consecutive 'merge' events with no barrier between them.
const groups = []; let cur = [];
for (const ev of events) {
  if (ev.type === 'merge') cur.push(ev);
  else if (ev.type === 'barrier') { if (cur.length) groups.push(cur); cur = []; }
}
if (cur.length) groups.push(cur);

const edits = []; // {pos,end,text}
const bundled = new Set();
let gi = 0;
for (const g of groups) {
  if (g.length < 2) continue;
  let css = '';
  for (const ev of g) {
    const file = path.join(dist, ev.href);
    if (!fs.existsSync(file)) throw new Error('missing css file ' + ev.href);
    const body = fs.readFileSync(file, 'utf8');
    if (/@import\b/i.test(body)) throw new Error('@import found in ' + ev.href);
    css += '/* ==== ' + ev.href + ' ==== */\n' + body + (body.endsWith('\n') ? '' : '\n');
    bundled.add(ev.href);
  }
  const hash = crypto.createHash('sha1').update(css).digest('hex').slice(0, 10);
  const name = 'css/bundle-' + (++gi) + '-' + hash + '.css';
  fs.writeFileSync(path.join(dist, name), css);
  edits.push({ pos: g[0].pos, end: g[0].end, text: '<link rel="stylesheet" href="' + name + '"/>' });
  for (const ev of g.slice(1)) {
    let end = ev.end; while (html[end] === ' ' || html[end] === '\t') end++; if (html[end] === '\r') end++; if (html[end] === '\n') end++;
    edits.push({ pos: ev.pos, end, text: '' });
  }
  console.log('bundle', name, 'from', g.length, 'files,', css.length, 'bytes');
}
// Drop preloads that pointed at files which are now inside a bundle (they would be fetched twice).
for (const ev of events) if (ev.type === 'preload' && bundled.has(ev.href)) {
  let end = ev.end; if (html[end] === '\r') end++; if (html[end] === '\n') end++;
  edits.push({ pos: ev.pos, end, text: '' });
}
if (!edits.length) { console.log('nothing to bundle'); process.exit(0); }
edits.sort((a, b) => b.pos - a.pos);
for (const e of edits) html = html.slice(0, e.pos) + e.text + html.slice(e.end);

// Sanity checks.
if (!html.includes('</head>') || !html.includes('</body>') || !html.includes('</html>')) throw new Error('document structure lost');
const left = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].filter(m => !inDead(m.index)).length;
if (html.length < origLen * 0.9) throw new Error('index.html shrank unexpectedly');
fs.writeFileSync(indexPath, html);
console.log('ok: removed', bundled.size, 'separate stylesheet links; index.html', origLen, '->', html.length, 'bytes');
