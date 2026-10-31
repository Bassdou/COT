'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setupMonth, setShiftCode, readDay, row } = require('./helpers/loadApp');

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

test('התראה על שמירה דורסת: אם הענן השתנה מאז הטעינה, שואלים לפני שמירה - ביטול לא שומר', async () => {
  const app = ready();
  app.ctx.__lastKnownRemoteState = JSON.stringify({ monthlyBalances: { '2026-10': { reg: 10 } }, carryOver: {} });
  app.state.getImpl = async () => ({ exists: true, data: () => ({ monthlyBalances: { '2026-10': { reg: 999 } }, carryOver: {} }) });
  app.confirms.answer = false;
  await app.ctx.saveData();
  assert.equal(app.confirms.asked.length, 1);
  assert.match(app.confirms.asked[0], /שינויים נוספים נשמרו לענן/);
  const write = app.state.sets.find((s) => s.data.employeeName);
  assert.equal(write, undefined, 'לא אמור להישמר כלום אחרי ביטול');
});

test('התראה על שמירה דורסת: אישור ממשיך בשמירה כרגיל', async () => {
  const app = ready();
  app.ctx.__lastKnownRemoteState = JSON.stringify({ monthlyBalances: { '2026-10': { reg: 10 } }, carryOver: {} });
  app.state.getImpl = async () => ({ exists: true, data: () => ({ monthlyBalances: { '2026-10': { reg: 999 } }, carryOver: {} }) });
  app.confirms.answer = true;
  await app.ctx.saveData();
  assert.equal(app.confirms.asked.length, 1);
  const write = app.state.sets.find((s) => s.data.employeeName);
  assert.ok(write, 'השמירה אמורה להמשיך אחרי אישור');
});

test('אין שום התראה כשהמצב בענן לא השתנה מאז הטעינה', async () => {
  const app = ready();
  const state = { monthlyBalances: { '2026-10': { reg: 10 } }, carryOver: {} };
  app.ctx.__lastKnownRemoteState = JSON.stringify(state);
  app.state.getImpl = async () => ({ exists: true, data: () => state });
  await app.ctx.saveData();
  assert.equal(app.confirms.asked.length, 0);
});

test('שמירה שקטה (silent, לדוגמה בהתנתקות) לא בודקת התנגשות ולא מציגה חלון', async () => {
  const app = ready();
  app.ctx.__lastKnownRemoteState = JSON.stringify({ monthlyBalances: { '2026-10': { reg: 10 } }, carryOver: {} });
  app.state.getImpl = async () => ({ exists: true, data: () => ({ monthlyBalances: { '2026-10': { reg: 999 } }, carryOver: {} }) });
  await app.ctx.saveData(true);
  assert.equal(app.confirms.asked.length, 0);
});

test('captureDraftSnapshot: null כשאין גליון פתוח; אחרת כולל שם/תעריפים/משמרות', () => {
  const empty = loadApp();
  assert.equal(empty.ctx.captureDraftSnapshot(), null);

  const app = ready();
  setShiftCode(app, 3, 'ב');
  const snap = app.ctx.captureDraftSnapshot();
  assert.equal(snap.year, 2026);
  assert.equal(snap.month, 10);
  assert.equal(snap.employeeName, 'בודק');
  assert.equal(snap.shifts[2].shiftType, 'ב');
});

test('saveDraftBeforeRefresh לא שומר כלום אם אין הזנות שלא נשמרו (__cotDirty=false)', () => {
  const app = ready();
  app.ctx.__cotDirty = false;
  app.ctx.saveDraftBeforeRefresh();
  assert.equal(app.ctx.sessionStorage.getItem('cotDraftSnapshot'), null);
});

test('applyUpdate שומר טיוטה לפני הרענון הכפוי, כשיש הזנות שלא נשמרו', () => {
  const app = ready();
  setShiftCode(app, 5, 'ל');
  app.doc.dispatch('change', { target: row(app, 5).querySelector('.time-input') }); // מסמן __cotDirty
  app.ctx.applyUpdate();
  const saved = JSON.parse(app.ctx.sessionStorage.getItem('cotDraftSnapshot'));
  assert.equal(saved.shifts[4].shiftType, 'ל');
});

test('restoreDraftSnapshot: משחזר שם/תעריפים/חודש/משמרות, ומוחק את הטיוטה אחרי השימוש (חד-פעמי)', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 }); // מדמה שהדף כבר אתחל את רשימת החודשים (initMonthYearSelect), כמו באפליקציה האמיתית
  app.ctx.sessionStorage.setItem('cotDraftSnapshot', JSON.stringify({
    year: 2026, month: 10, employeeName: 'משוחזר', hourlyRate: '60', eshelRate: '55',
    shifts: [{}, {}, { shiftType: 'ב', start: '07:00', end: '19:00' }],
  }));
  app.ctx.restoreDraftSnapshot();
  assert.equal(app.doc.getElementById('employeeName').value, 'משוחזר');
  assert.equal(app.doc.getElementById('hourlyRate').value, '60');
  assert.equal(row(app, 3).querySelector('.shift-type-input').value, 'ב');
  assert.equal(app.ctx.sessionStorage.getItem('cotDraftSnapshot'), null, 'הטיוטה נמחקת אחרי שחזור חד-פעמי');
});

test('בלי טיוטה שמורה, restoreDraftSnapshot לא עושה כלום (לא קורס, לא פותח הודעה)', () => {
  const app = loadApp();
  app.ctx.restoreDraftSnapshot();
  assert.equal(app.alerts.length, 0);
});
