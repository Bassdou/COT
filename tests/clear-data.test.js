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

test('משתמש ותיק עם סיסמה ישנה (חלשה) מקבל הצעה להחליף אותה, עם תאריך היעד', () => {
  const app = loadApp();
  app.state.currentUser = { uid: 'u1', email: 'a@b.co', emailVerified: true };
  const weakDoc = { exists: true, data: () => ({ hasStrongPassword: false }) };
  app.ctx.enterMainApp(app.state.currentUser, weakDoc);
  const banner = app.doc.getElementById('securityBanner');
  assert.equal(banner.style.display, 'block');
  assert.equal(banner.className, 'warning-banner');
  assert.ok(banner.innerHTML.includes('15.11.2026'), 'תאריך היעד חסר מהבאנר');
  assert.ok(banner.innerHTML.includes('openPasswordUpdatePrompt'), 'חסר קישור להחלפת הסיסמה');
});

test('משתמש ותיק עם סיסמה חזקה לא מקבל את ההצעה', () => {
  const app = loadApp();
  app.state.currentUser = { uid: 'u1', email: 'a@b.co', emailVerified: true };
  const strongDoc = { exists: true, data: () => ({ hasStrongPassword: true }) };
  app.ctx.enterMainApp(app.state.currentUser, strongDoc);
  assert.equal(app.doc.getElementById('securityBanner').style.display, 'none');
});

test('openPasswordUpdatePrompt פותח מרצון את מסך עדכון הסיסמה, עם אפשרות ביטול', () => {
  const app = loadApp();
  app.ctx.openPasswordUpdatePrompt();
  assert.equal(app.doc.getElementById('forcePasswordScreen').style.display, 'flex');
  assert.equal(app.doc.getElementById('forcePasswordCancelRow').style.display, 'block');
  app.ctx.cancelPasswordUpdate();
  assert.equal(app.doc.getElementById('forcePasswordScreen').style.display, 'none');
});

test('openCarryModal: ניתן לפתוח מחדש את חלון המשמרות הנגררות לתיקון, עם ערך קודם', () => {
  const app = loadApp();
  app.ctx.carryOverData['2026-10'] = 2;
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  app.ctx.openCarryModal(3);
  assert.equal(app.doc.getElementById('manualCarryInput').value, '3');
  assert.equal(app.doc.getElementById('firstMonthCarryModal').style.display, 'block');
});

test('שדה manualCarryInput מוגדר לשמור בלחיצת Enter (לא רק בלחיצת כפתור)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'components.js'), 'utf8');
  const m = html.match(/<input type="number" id="manualCarryInput"[^>]*>/);
  assert.ok(m, 'שדה manualCarryInput לא נמצא');
  assert.match(m[0], /onkeydown="if\(event\.key==='Enter'\)\{event\.preventDefault\(\);saveFirstMonthCarry\(\);\}"/);
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

test('customDialog: כותרת אישית עם שם העובד, ללא שם נופל ל"לתשומת לבך"', () => {
  const app = loadApp();
  app.doc.getElementById('employeeName').value = 'בסאם';
  app.ctx.customDialog('alert', 'הגליון נשמר בהצלחה');
  assert.equal(app.doc.getElementById('customDialogTitle').innerText, 'לתשומת לבך, בסאם');
  app.doc.getElementById('employeeName').value = '';
  app.ctx.customDialog('alert', 'משהו');
  assert.equal(app.doc.getElementById('customDialogTitle').innerText, 'לתשומת לבך');
});

test('customDialog: אייקון ירוק להצלחה, אדום לשגיאה, ענבר לאישור/שאלה', () => {
  const app = loadApp();
  app.ctx.customDialog('alert', 'הגליון נשמר בהצלחה');
  assert.equal(app.doc.getElementById('customDialogIcon').style.background, '#F0FDF4');
  app.ctx.customDialog('alert', 'אירעה שגיאה בטעינה');
  assert.equal(app.doc.getElementById('customDialogIcon').style.background, '#FDF2F2');
  app.ctx.customDialog('confirm', 'לאפס את הגליון?');
  assert.equal(app.doc.getElementById('customDialogIcon').style.background, '#F3E8DA');
});

test('toggleTableView מחליף בין תצוגה מלאה לפשוטה ועדכון התווית/aria-pressed', () => {
  const app = loadApp();
  const tc = app.doc.getElementById('tableContainer');
  tc.classList.remove('simple-view');
  app.ctx.toggleTableView();
  assert.equal(tc.classList.contains('simple-view'), true);
  assert.equal(app.doc.getElementById('viewToggleBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(app.doc.getElementById('viewToggleLabel').innerText, 'תצוגה מלאה');
  app.ctx.toggleTableView();
  assert.equal(tc.classList.contains('simple-view'), false);
  assert.equal(app.doc.getElementById('viewToggleLabel').innerText, 'תצוגה פשוטה');
});

test('applyDefaultTableView: רוחב מסך צר (<700) נכנס לתצוגה פשוטה כברירת מחדל', () => {
  const app = loadApp();
  app.ctx.innerWidth = 480;
  app.ctx.applyDefaultTableView();
  assert.equal(app.doc.getElementById('tableContainer').classList.contains('simple-view'), true);
  app.ctx.innerWidth = 1440;
  app.ctx.applyDefaultTableView();
  assert.equal(app.doc.getElementById('tableContainer').classList.contains('simple-view'), false);
});
