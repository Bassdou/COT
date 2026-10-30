'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadApp, setupMonth, setShiftCode, readDay, SPLIT_FILES } = require('./helpers/loadApp');

function ready() {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50, openBalances: { reg: 5, shab: 0, sick: 0, dec: 0, cho: 0 } });
  setShiftCode(app, 5, 'ב'); setShiftCode(app, 6, 'ל');
  return app;
}

test('clearData(true): איפוס מלא ושקט (התנתקות / החלפת משתמש)', async () => {
  const app = ready();
  await app.ctx.clearData(true);
  assert.equal(app.doc.getElementById('tbody').children.length, 0);
  assert.equal(app.doc.getElementById('tableContainer').style.display, 'none');
  assert.equal(app.doc.getElementById('employeeName').value, '');
  assert.equal(app.doc.getElementById('hourlyRate').value, '0.00');
  assert.equal(app.doc.getElementById('eshelRate').value, '52.66');
  assert.deepEqual(Object.keys(app.ctx.carryOverData), []);
  assert.deepEqual(Object.keys(app.ctx.monthlyBalances), []);
  assert.equal(app.confirms.asked.length, 0, 'אין חלון אישור באיפוס שקט');
  assert.ok(app.doc.getElementById('monthYearSelect').options.length > 0, 'רשימת החודשים נבנתה מחדש');
});

test('clearData(): כפתור "אפס גליון" מבקש אישור; ביטול לא מוחק', async () => {
  const app = ready();
  app.confirms.answer = false;
  await app.ctx.clearData();
  assert.equal(app.confirms.asked.length, 1);
  assert.equal(readDay(app, 5).shiftInput, 'ב');
});

test('clearData(): אישור מנקה את כל ההזנות ושומר שם ותעריפים', async () => {
  const app = ready();
  app.confirms.answer = true;
  await app.ctx.clearData();
  assert.equal(readDay(app, 5).shiftInput, '');
  assert.equal(readDay(app, 6).shiftInput, '');
  assert.equal(app.doc.getElementById('employeeName').value, 'בודק');
  assert.equal(app.doc.getElementById('tlushCost').innerText, '0.00 ₪');
});

test('clearData(false): ניקוי אחרי סגירת חודש ללא חלון אישור', async () => {
  const app = ready();
  await app.ctx.clearData(false);
  assert.equal(app.confirms.asked.length, 0);
  assert.equal(readDay(app, 5).shiftInput, '');
});

test('clearData() כשאין טבלה על המסך לא עושה כלום', async () => {
  const app = loadApp();
  await app.ctx.clearData();
  assert.equal(app.confirms.asked.length, 0);
});

test('טעינת הדף לא מוחקת סשן מחובר שכבר שוחזר', () => {
  const app = ready();
  app.state.currentUser = { uid: 'u1' };
  app.ctx.onload();
  assert.equal(app.doc.getElementById('employeeName').value, 'בודק');
  assert.equal(app.doc.getElementById('tbody').children.length, 31);
});

test('טעינת הדף ללא משתמש מחובר מנקה שדות (כמו התנהגות מקורית מיועדת)', () => {
  const app = ready();
  app.state.currentUser = null;
  app.ctx.onload();
  return new Promise((r) => setTimeout(r, 20)).then(() => assert.equal(app.doc.getElementById('employeeName').value, ''));
});

test('מתג ENABLE_TEST_BYPASS: כשהוא false, 3 לחיצות על הלוגו לא פותחות בקשת קוד', async () => {
  const authSrc = fs.readFileSync(path.join(__dirname, '..', '03-auth.js'), 'utf8');
  assert.ok(authSrc.includes('const ENABLE_TEST_BYPASS = true;'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cot-'));
  const tmpAuth = path.join(tmpDir, '03-auth.js');
  fs.writeFileSync(tmpAuth, authSrc.replace('const ENABLE_TEST_BYPASS = true;', 'const ENABLE_TEST_BYPASS = false;'));
  const filesOn = SPLIT_FILES;
  const filesOff = SPLIT_FILES.map((f) => (f === '03-auth.js' ? path.resolve(tmpAuth) : f));
  for (const [files, expectPrompt] of [[filesOn, true], [filesOff, false]]) {
    const app = loadApp({ files });
    let prompted = 0;
    app.ctx.customPrompt = () => { prompted++; return Promise.resolve(null); };
    for (let i = 0; i < 3; i++) await app.ctx.secretBypass({ preventDefault() {} });
    assert.equal(prompted > 0, expectPrompt);
  }
});

test('מצב עקיפה (secretBypass): נכנס עם שם עובד "בדיקות דוח" לאחר קוד נכון', async () => {
  const app = loadApp();
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const code = String(999999 - parseInt(p2(now.getDate()) + p2(now.getMonth() + 1) + String(now.getFullYear()).slice(-2), 10));
  app.ctx.customPrompt = () => Promise.resolve(code);
  for (let i = 0; i < 3; i++) await app.ctx.secretBypass({ preventDefault() {} });
  assert.equal(app.ctx.isBypassed, true);
  assert.equal(app.ctx.isTesterMode, true);
  assert.equal(app.doc.getElementById('employeeName').value, 'בדיקות דוח');
});
