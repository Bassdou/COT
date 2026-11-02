'use strict';
// בדיקות לנעילת מסך: (1) לא מציגים הודעת חוסר-פעילות כשכבר במסך ההתחברות, (2) כפתור נעילה ידני.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/loadApp');

test('lockScreenNow: עם משתמש מחובר, נועלת ומציגה הודעה', () => {
  const app = loadApp();
  app.state.currentUser = { uid: 'u1', email: 'a@b.co' };
  app.ctx.lockScreenNow('הודעת נעילה');
  assert.equal(app.ctx.isScreenLocked, true);
  assert.equal(app.ctx.lockedEmail, 'a@b.co');
  assert.equal(app.doc.getElementById('authScreen').style.display, 'flex');
  assert.ok(app.alerts.includes('הודעת נעילה'));
});

test('lockScreenNow: בלי משתמש מחובר ובלי bypass - אין מה לנעול, לא עושה כלום', () => {
  const app = loadApp();
  app.state.currentUser = null;
  app.ctx.isBypassed = false;
  app.ctx.lockScreenNow('לא אמורה להופיע');
  assert.equal(app.ctx.isScreenLocked, false);
  assert.ok(!app.alerts.includes('לא אמורה להופיע'));
});

test('lockScreenNow: בלי הודעה (reasonMessage לא סופק) - נועלת בלי להציג התראה', () => {
  const app = loadApp();
  app.state.currentUser = { uid: 'u1', email: 'a@b.co' };
  app.ctx.lockScreenNow();
  assert.equal(app.ctx.isScreenLocked, true);
  assert.equal(app.alerts.length, 0);
});

test('כפתור נעילת המסך קיים בסרגל העליון וקורא ל-lockScreenNow', () => {
  const fs = require('fs'); const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('id="lockScreenBtn"') && html.includes('onclick="lockScreenNow()"'));
});

test('טיימר חוסר-הפעילות (initIdleTimer) בודק אם כבר במסך ההתחברות לפני שסופר/מתריע', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '03-auth.js'), 'utf8');
  const fnBody = src.slice(src.indexOf('function initIdleTimer'));
  assert.match(fnBody, /atLoginScreen/, 'הטיימר אמור לבדוק אם כבר במסך ההתחברות לפני שממשיך');
});
