'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/loadApp');

const settingsListeners = (app) => app.state.snapshots.filter((s) => s.col === 'system' && s.id === 'settings');
const fire = (l, v) => l.cb({ exists: true, data: () => ({ latestVersion: v }) });

test('checkForUpdates רשומה להאזנה אחת בלבד גם כשנקראת כמה פעמים', async () => {
  const app = loadApp({ fetch: async () => ({ json: async () => ({ version: 'V2' }) }) });
  const before = settingsListeners(app).length; // האזנת מצב התחזוקה
  await app.ctx.checkForUpdates();
  await app.ctx.checkForUpdates();
  await app.ctx.checkForUpdates();
  assert.equal(settingsListeners(app).length, before + 1);
});

test('משתמש רגיל מקבל הודעת עדכון כשגרסת הענן שונה', async () => {
  const app = loadApp({ fetch: async () => ({ json: async () => ({ version: 'V2' }) }) });
  await app.ctx.checkForUpdates();
  const l = settingsListeners(app).pop();
  fire(l, 'V2');
  assert.equal(app.ctx.newCloudVersion, undefined, 'אותה גרסה: אין הודעה');
  fire(l, 'V3');
  assert.equal(app.ctx.newCloudVersion, 'V3');
  assert.equal(app.doc.getElementById('updateToast').style.display, 'flex');
});

test('מנהל מעדכן את latestVersion בענן לגרסה המקומית (פעם אחת)', async () => {
  const app = loadApp({ fetch: async () => ({ json: async () => ({ version: 'V2' }) }) });
  app.state.currentUser = { email: 'Bassam@bsbc.co.il' };
  await app.ctx.checkForUpdates();
  fire(settingsListeners(app).pop(), 'V1');
  const adminSets = app.state.sets.filter((s) => s.data.latestVersion);
  assert.equal(adminSets.length, 1);
  assert.equal(adminSets[0].data.latestVersion, 'V2');
});

test('מנהל שהתחבר אחרי שההאזנה כבר קיבלה נתונים עדיין מעדכן', async () => {
  const app = loadApp({ fetch: async () => ({ json: async () => ({ version: 'V2' }) }) });
  await app.ctx.checkForUpdates();
  fire(settingsListeners(app).pop(), 'V1');
  assert.equal(app.state.sets.length, 0);
  app.state.currentUser = { email: 'bassam@bsbc.co.il' };
  await app.ctx.checkForUpdates();
  assert.equal(app.state.sets.length, 1);
});

test('מצב הבדיקות הסמוי (isTesterMode) מדלג על בדיקת גרסה מול הענן', async () => {
  const app = loadApp({ fetch: async () => ({ json: async () => ({ version: 'V2' }) }) });
  // תמיד נרשמת כבר האזנה אחת ל-system/settings מראש (מצב תחזוקה, session-data.js) - זו אינה בדיקת הגרסה.
  const before = settingsListeners(app).length;
  app.ctx.isTesterMode = true;
  await app.ctx.checkForUpdates();
  assert.equal(settingsListeners(app).length, before, 'לא נוספה האזנה לבדיקת גרסה במצב בדיקות');
  assert.equal(app.state.sets.length, 0, 'לא נכתב דבר לענן במצב בדיקות');
});
