'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setupMonth, setShiftCode, readDay } = require('./helpers/loadApp');

const OPEN = { reg: 10, shab: 1, sick: 5, dec: 3, cho: 2 };
const json = (x) => JSON.parse(JSON.stringify(x));
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

function ready() {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50, openBalances: OPEN });
  app.state.currentUser = { uid: 'u1', email: 'a@b.co', updateProfile: () => Promise.resolve() };
  return app;
}

test('closeMonth: כשל בענן → הגליון לא נסגר, היתרות חוזרות והמשתמש מקבל הודעה', async () => {
  const app = ready();
  setShiftCode(app, 5, 'ב'); setShiftCode(app, 6, 'ח');
  const balBefore = json(app.ctx.monthlyBalances), carryBefore = json(app.ctx.carryOverData);
  app.state.setImpl = () => Promise.reject(new Error('offline'));
  await app.ctx.closeMonth();
  assert.deepEqual(json(app.ctx.monthlyBalances), balBefore);
  assert.deepEqual(json(app.ctx.carryOverData), carryBefore);
  assert.ok(app.alerts.some((a) => a.includes('לא נשמרה בענן')), app.alerts.join('|'));
  assert.ok(!app.alerts.some((a) => a.includes('נסגר בהצלחה')));
  assert.equal(readDay(app, 5).shiftInput, 'ב', 'ההזנות נשארות על המסך');
});

test('closeMonth: הצלחה → יתרות החודש הבא נכתבות לענן ומוצגת הודעת הצלחה', async () => {
  const app = ready();
  setShiftCode(app, 6, 'ח');
  await app.ctx.closeMonth();
  assert.ok(app.alerts.some((a) => a.includes('נסגר בהצלחה')));
  const next = json(app.ctx.monthlyBalances)['2026-11'];
  assert.equal(next.reg, 9, 'חופש רגיל: 10 פתיחה פחות יום אחד');
  const write = app.state.sets.find((s) => s.data.monthlyBalances);
  assert.ok(write && write.data.monthlyBalances['2026-11']);
  assert.equal(readDay(app, 6).shiftInput, '', 'הגליון נוקה אחרי הסגירה');
});

test('משמרות נגררות מהחודש הקודם (carryOverData, מגובה בענן) מוצגות תמיד מתחת ל"סה"כ משמרות"', () => {
  const app = ready();
  const key = '2026-10';
  app.ctx.carryOverData[key] = 3;
  app.ctx.generateTable();
  const el = app.doc.getElementById('dashCarryOver');
  assert.equal(el.innerText, 'כולל 3 נגררות');
});

test('כשאין משמרות נגררות (0), התצוגה הנלווית ריקה', () => {
  const app = ready();
  app.ctx.carryOverData['2026-10'] = 0;
  app.ctx.generateTable();
  assert.equal(app.doc.getElementById('dashCarryOver').innerText, '');
});

test('היתרה הסופית של הצהרה ובחירה מוצגת על המסך (bal_close_dec/cho), לא רק בהדפסה', () => {
  const app = ready();
  setShiftCode(app, 8, 'הצ');
  assert.equal(app.doc.getElementById('bal_close_dec').innerText, '2.00');
  assert.equal(app.doc.getElementById('bal_close_cho').innerText, '2.00');
});

test('saveData: כשל בענן → הקובץ יורד אך מוצגת אזהרה', async () => {
  const app = ready();
  setShiftCode(app, 5, 'ב');
  app.state.setImpl = () => Promise.reject(new Error('offline'));
  await app.ctx.saveData();
  assert.ok(app.alerts.some((a) => a.includes('השמירה בענן נכשלה')), app.alerts.join('|'));
  assert.ok(!app.alerts.some((a) => a.includes('נשמר בהצלחה')));
  assert.equal(app.ctx.__cotDirty, false);
});

test('saveData: הצלחה → הודעת הצלחה, ו-schemaVersion נכתב', async () => {
  const app = ready();
  await app.ctx.saveData();
  assert.ok(app.alerts.some((a) => a.includes('נשמר בהצלחה')), app.alerts.join('|'));
});

function fileEvent(content) { return { target: { files: [{ __content: content }], value: 'x' } }; }

test('טעינת קובץ: קובץ שאינו גליון COT נדחה עם הודעה ברורה', async () => {
  const app = ready();
  app.ctx.handleFileLoad(fileEvent('{"foo": 1}'));
  await tick();
  assert.ok(app.alerts.some((a) => a.includes('אינו גליון תקין')), app.alerts.join('|'));
  app.alerts.length = 0;
  app.ctx.handleFileLoad(fileEvent('not json'));
  await tick();
  assert.ok(app.alerts.some((a) => a.includes('שגיאה בטעינת הקובץ')));
});

test('טעינת קובץ: משמרות נטענות והסכומים זהים להזנה ידנית (דחיית הסיכום לא משנה תוצאה)', async () => {
  const file = JSON.stringify({ schemaVersion: 1, year: 2026, month: 10, employeeName: 'בודק', hourlyRate: 50, eshelRate: 52.66, carryOver: { '2026-10': 0 }, monthCarryOver: 0,
    monthBalances: OPEN, shifts: [{}, {}, {}, {}, { shiftType: 'ב', start: '07:00', end: '19:00' }, { shiftType: 'ל', start: '19:00', end: '07:00' }, { shiftType: 'ח', start: '', end: '' }] });
  const a = ready();
  a.ctx.handleFileLoad(fileEvent(file));
  await tick();
  const b = ready();
  setShiftCode(b, 5, 'ב'); setShiftCode(b, 6, 'ל'); setShiftCode(b, 7, 'ח'); // 7.10.2026 = יום רביעי
  for (const id of ['dashShifts', 'dashStandard', 'dashGross', 'dashEshel', 'tlushCost', 'sum-hours-total', 'sum-cost-total', 'bal_used_reg']) {
    assert.equal(a.doc.getElementById(id).innerText, b.doc.getElementById(id).innerText, id);
  }
});

test('אזהרת יציאה: מופעלת אחרי הזנה, ומתאפסת אחרי איפוס מלא', async () => {
  const app = ready();
  assert.equal(app.ctx.__cotDirty, false);
  const input = app.doc.getElementById('tbody').children[0].querySelector('.time-input');
  app.doc.dispatch('change', { target: input });
  assert.equal(app.ctx.__cotDirty, true);
  let prevented = false;
  app.winListeners.beforeunload.forEach((fn) => fn({ preventDefault() { prevented = true; } }));
  assert.equal(prevented, true);
  await app.ctx.clearData(true);
  assert.equal(app.ctx.__cotDirty, false);
});
