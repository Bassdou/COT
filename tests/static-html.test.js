'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const comps = fs.readFileSync(path.join(root, 'components.js'), 'utf8');

test('כל תווית <label> מקושרת לשדה קיים (נגישות)', () => {
  const labels = html.match(/<label\b[^>]*>/g) || [];
  assert.ok(labels.length > 0);
  for (const l of labels) {
    const m = l.match(/for="([^"]+)"/);
    assert.ok(m, 'label ללא for: ' + l);
    assert.ok(new RegExp('id="' + m[1] + '"').test(html), 'אין שדה עם id=' + m[1]);
  }
});

test('חלונות קופצים מסומנים כ-dialog', () => {
  const modals = comps.match(/<div id="\w+" class="modal"[^>]*>/g) || [];
  assert.ok(modals.length >= 5);
  for (const m of modals) assert.ok(/role="dialog"/.test(m) && /aria-modal="true"/.test(m), m);
});

test('שדות תעריף לא מקבלים ערך שלילי', () => {
  assert.match(html, /id="hourlyRate" min="0"/);
  assert.match(html, /id="eshelRate" min="0"/);
});

test('כל קובצי ה-<script src> המקומיים שה-HTML טוען קיימים בפועל', () => {
  const refs = [...html.matchAll(/<script src="([^"#:]+\.js)">/g)].map((m) => m[1]);
  assert.ok(refs.includes('calculator.js') && refs.includes('00-core.js') && refs.includes('content-loader.js'));
  const missing = refs.filter((f) => !fs.existsSync(path.join(root, f)));
  assert.deepEqual(missing, []);
});

test('calculator.js (מנוע החישוב) טעון לפני כל קובץ שמשתמש בו', () => {
  const order = [...html.matchAll(/<script src="([^"]+\.js)">/g)].map((m) => m[1]).filter((f) => !f.startsWith('http'));
  const iCalc = order.indexOf('calculator.js');
  const iCodes = order.indexOf('01-shift-codes.js');
  const iCore = order.indexOf('00-core.js');
  assert.ok(iCalc > iCore && iCalc > iCodes, 'calculator.js חייב להיטען אחרי 00-core.js ו-01-shift-codes.js');
});

test('content-loader.js מפנה לקובצי התוכן הקיימים', () => {
  const loader = fs.readFileSync(path.join(root, 'content-loader.js'), 'utf8');
  for (const f of ['content/shift-info.he.html', 'content/mini-shift-info.he.html']) {
    assert.ok(loader.includes(f), 'content-loader.js לא מפנה ל-' + f);
    assert.ok(fs.existsSync(path.join(root, f)), f + ' לא קיים');
  }
});

test('קובצי PDF משפטיים (תקנון, פרטיות, נגישות) קיימים', { todo: 'terms.pdf / privacy.pdf / accessibility.pdf לא צורפו לחבילה' }, () => {
  for (const f of ['terms.pdf', 'privacy.pdf', 'accessibility.pdf']) assert.ok(fs.existsSync(path.join(root, f)), f);
});

test('מקרא הצבעים מעל הטבלה קיים', () => {
  assert.match(html, /id="colorLegend"/);
  for (const cls of ['legend-absence', 'legend-negative', 'legend-holiday', 'legend-weekend']) assert.ok(html.includes(cls), cls);
});

test('פאביקון מוגדר', () => {
  assert.match(html, /<link rel="icon"/);
});

test('משתני הצבע המשותפים (--c-primary) מוגדרים ומשומשים, כדי שמסך הכניסה והמסך הראשי ישתמשו באותה פלטה', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /--c-primary:\s*#1D4E89/);
  assert.match(css, /--navy-900:\s*#16233B/);
  assert.match(css, /--amber:\s*#B06F1F/);
  assert.ok(css.includes('var(--c-primary)'));
  assert.ok(!css.includes('#1565c0') && !css.includes('#2563eb'), 'נשאר שימוש בכחול מפלטה ישנה (מהעיצוב הקודם) שהיה אמור להתאחד');
});

test('גופן Heebo טעון ב-index.html', () => {
  assert.match(html, /fonts\.googleapis\.com\/css2\?family=Heebo/);
});

test('שורת קוביות הסיכום (kpiRow) מופיעה לפני הטבלה, לא אחריה', () => {
  const iPanel = html.indexOf('class="header-panel"');
  const iKpi = html.indexOf('id="kpiRow"');
  const iTable = html.indexOf('id="tableContainer"');
  assert.ok(iPanel > -1 && iKpi > -1 && iTable > -1);
  assert.ok(iPanel < iKpi && iKpi < iTable, 'הסדר הצפוי: רצועת בקרה -> קוביות סיכום -> טבלה');
});

test('רקע מסך הכניסה בהיר (כדי שהכרטיס, כולל הפאנל הכהה, יבלוט עליו)', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const m = css.match(/\.full-screen-overlay\s*\{[^}]*\}/);
  assert.ok(m, '.full-screen-overlay לא נמצא');
  assert.match(m[0], /background:\s*var\(--ground\)/);
  assert.ok(!/background:\s*var\(--navy-900\)/.test(m[0]), 'הרקע עדיין כהה - לא יבלוט מול הפאנל הכהה שבכרטיס');
});

test('כפתורי הפעולה (טען/שמור/הכן/אפס גליון) בשורה אחת, לא רשת 2x2', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /\.action-grid\s*\{\s*display:\s*flex;/);
});
