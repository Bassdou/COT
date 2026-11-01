'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function article(date, expires, pinned, title) {
  return { getAttribute: (k) => ({ 'data-date': date, 'data-expires': expires, 'data-pinned': pinned ? 'true' : null }[k]), title };
}
function filterByExpiry(items, today) {
  return items.filter((a) => { const exp = a.getAttribute('data-expires'); return !exp || exp >= today; });
}
function sortItems(items) {
  return [...items].sort((x, y) => {
    const px = x.getAttribute('data-pinned') === 'true', py = y.getAttribute('data-pinned') === 'true';
    if (px !== py) return px ? -1 : 1;
    return (y.getAttribute('data-date') || '').localeCompare(x.getAttribute('data-date') || '');
  });
}

test('הודעות שפג תוקפן (data-expires עבר) לא מוצגות', () => {
  const past = article('2026-01-01', '2026-01-15', false, 'ישנה');
  const current = article('2026-10-20', '2026-12-01', false, 'נוכחית');
  const items = filterByExpiry([past, current], '2026-10-31');
  assert.deepEqual(items.map((i) => i.title), ['נוכחית']);
});

test('מיון: מוצמדות קודם, ואז לפי תאריך יורד בתוך כל קבוצה', () => {
  const a = article('2026-10-15', '2026-11-20', true, 'מוצמדת');
  const b = article('2026-10-31', '2026-11-30', false, 'חדשה');
  const c = article('2026-10-27', '2026-11-10', false, 'ישנה-יותר');
  const items = sortItems([b, c, a]);
  assert.deepEqual(items.map((i) => i.title), ['מוצמדת', 'חדשה', 'ישנה-יותר']);
});

test('content/system-updates.he.html: כל הודעה כוללת data-date ו-data-expires', () => {
  const html = fs.readFileSync(path.join(ROOT, 'content', 'system-updates.he.html'), 'utf8');
  const articles = html.match(/<article\s[^>]*>/g) || []; // \s (לא \b) כדי לא לתפוס את "<article>" שמופיע בהערת התיעוד למעלה
  assert.ok(articles.length >= 1);
  for (const a of articles) {
    assert.match(a, /data-date="\d{4}-\d{2}-\d{2}"/, a);
    assert.match(a, /data-expires="\d{4}-\d{2}-\d{2}"/, a);
  }
});

test('content-loader.js מפנה גם לקובץ עדכוני המערכת', () => {
  const loader = fs.readFileSync(path.join(ROOT, 'content-loader.js'), 'utf8');
  assert.ok(loader.includes('content/system-updates.he.html'));
  assert.ok(fs.existsSync(path.join(ROOT, 'content', 'system-updates.he.html')));
});

test('תקינות content/system-updates.he.html: אין יותר מהודעה מוצמדת (pinned) אחת פעילה (לא פגת תוקף) בו-זמנית', () => {
  const html = fs.readFileSync(path.join(ROOT, 'content', 'system-updates.he.html'), 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const articles = html.match(/<article\s[^>]*>/g) || [];
  const activePinned = articles.filter((a) => {
    const pinned = /data-pinned="true"/.test(a);
    const expMatch = a.match(/data-expires="(\d{4}-\d{2}-\d{2})"/);
    const notExpired = !expMatch || expMatch[1] >= today;
    return pinned && notExpired;
  });
  assert.ok(activePinned.length <= 1, 'יותר מהודעה מוצמדת אחת פעילה בו-זמנית - עלול להיראות מבולגן בראש הרשימה');
});

test('תקינות content/system-updates.he.html: data-expires תמיד >= data-date (לא הודעה שפג תוקפה לפני שפורסמה)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'content', 'system-updates.he.html'), 'utf8');
  const articles = html.match(/<article\s[^>]*>/g) || [];
  for (const a of articles) {
    const date = a.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
    const exp = a.match(/data-expires="(\d{4}-\d{2}-\d{2})"/);
    assert.ok(date && exp, 'חסר data-date או data-expires: ' + a);
    assert.ok(exp[1] >= date[1], 'data-expires קודם ל-data-date: ' + a);
  }
});

test('תקינות content/system-updates.he.html: מספר תגיות <article> פתיחה תואם לסגירה (אין HTML שבור)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'content', 'system-updates.he.html'), 'utf8');
  const opens = (html.match(/<article\s/g) || []).length;
  const closes = (html.match(/<\/article>/g) || []).length;
  assert.equal(opens, closes, 'מספר ה-<article> הפתוחות לא תואם לסגורות');
});

test('whats-new.html (ארכיון היסטוריית עדכונים) קיים, מקושר מראש מסך הכניסה', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'whats-new.html')));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('href="whats-new.html"'));
});

test('tools/system-update-composer.html (כלי הרכבת עדכונים) קיים', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'tools', 'system-update-composer.html')));
});
