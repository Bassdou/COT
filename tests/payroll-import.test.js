'use strict';
// בדיקות ללוגיקת חילוץ והשוואת דוח השכר - מבוססות על הפורמט האמיתי של מחלקת השכר (טקסט עברי
// תקין, בעיית RTL בלבד - לא הדוגמה הראשונית שהתבררה כלא מייצגת). בלי PDF.js אמיתי (קשה לדמות
// בלי דפדפן אמיתי), אבל כן בודקות את הפונקציות הטהורות מול נתונים שמשקפים בדיוק את מה שנמצא
// בבדיקה ידנית מול דוח אמיתי (ראו ההיסטוריה של 09-payroll-import.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, setupMonth, setTimes } = require('./helpers/loadApp');

test('fixRtlLineTokens: משחזר שורה הפוכה (RTL) לסדר קריא - מספרים/שעות לא נהפכים, מילים עבריות כן', () => {
  const app = loadApp();
  // "02 ד 07:58 19:00 נוכחות 11.03 8.00 8.00 2.00 1.03 1.97" אחרי שחולץ הפוך (בדיוק כמו שנמצא בדוח האמיתי)
  const raw = ['1.97', '1.03', '2.00', '8.00', '8.00', '11.03', 'תוחכונ', '19:00', '07:58', 'ד', '02'];
  const fixed = app.ctx.fixRtlLineTokens(raw);
  assert.deepEqual(Array.from(fixed), ['02', 'ד', '07:58', '19:00', 'נוכחות', '11.03', '8.00', '8.00', '2.00', '1.03', '1.97']);
});

test('fixRtlLineTokens: שורת היעדרות ("ע"ח שבת") גם היא משוחזרת נכון', () => {
  const app = loadApp();
  const raw = ['8.00', '8.00', 'תבש', 'ח"ע', 'ג', '08'];
  const fixed = app.ctx.fixRtlLineTokens(raw);
  assert.deepEqual(Array.from(fixed), ['08', 'ג', 'ע"ח', 'שבת', '8.00', '8.00']);
});

test('parseDayLine: שורת נוכחות רגילה מחולצת לשדות הנכונים', () => {
  const app = loadApp();
  const tokens = ['02', 'ד', '07:58', '19:00', 'נוכחות', '11.03', '8.00', '8.00', '2.00', '1.03', '1.97'];
  const parsed = app.ctx.parseDayLine(tokens);
  assert.equal(parsed.day, 2);
  assert.equal(parsed.start, '07:58');
  assert.equal(parsed.end, '19:00');
  assert.equal(parsed.rawNumbers.length, 6);
  assert.equal(parsed.rawNumbers[0], 11.03);
});

test('parseDayLine: שורה בלי מספר יום בתחילתה (כמו כותרת) מוחזרת כ-null', () => {
  const app = loadApp();
  assert.equal(app.ctx.parseDayLine(['יום', 'כניסה', 'יציאה']), null);
});

test('extractReportPeriod: מחלץ חודש/שנה מהכותרת "לתקופה: 2026 / 09"', () => {
  const app = loadApp();
  const lines = [['דו"ח', 'פיצול', 'לתקופה:', '2026', '/', '09', 'הושלם']];
  const r = app.ctx.extractReportPeriod(lines);
  assert.equal(r.year, 2026);
  assert.equal(r.month, 9);
});

test('extractReportPeriod: בלי כותרת מתאימה, מחזיר null (לא קורס)', () => {
  const app = loadApp();
  assert.equal(app.ctx.extractReportPeriod([['שורה', 'רגילה']]), null);
});

test('checkPayrollPeriodMatch: חודש הדוח תואם לחודש הפתוח ב-COT', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  const r = app.ctx.checkPayrollPeriodMatch({ year: 2026, month: 9 });
  assert.equal(r.checked, true);
  assert.equal(r.match, true);
});

test('checkPayrollPeriodMatch: חודש הדוח שונה מהחודש הפתוח ב-COT - מתריע', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 }); // COT פתוח על אוקטובר
  const r = app.ctx.checkPayrollPeriodMatch({ year: 2026, month: 9 }); // הדוח הוא ספטמבר
  assert.equal(r.checked, true);
  assert.equal(r.match, false);
  assert.match(r.message, /9\/2026.*10\/2026|לא החודש הנכון/);
});

test('checkPayrollPeriodMatch: אם לא זוהה חודש בדוח כלל, לא קורס ומדווח checked=false', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  const r = app.ctx.checkPayrollPeriodMatch(null);
  assert.equal(r.checked, false);
});

test('verifyExtractionTotal: הסכום שחולץ תואם לסה"כ שבדוח - עובר בלי אזהרה', () => {
  const app = loadApp();
  const days = [{ rawNumbers: [11.03] }, { rawNumbers: [11.46] }];
  const r = app.ctx.verifyExtractionTotal(days, 22.49);
  assert.equal(r.checked, true);
  assert.equal(r.match, true);
});

test('verifyExtractionTotal: הסכום לא תואם - מתריע, עם הסכומים המדויקים', () => {
  const app = loadApp();
  const days = [{ rawNumbers: [11.03] }]; // חסר יום שלם, למשל
  const r = app.ctx.verifyExtractionTotal(days, 22.49);
  assert.equal(r.match, false);
  assert.equal(r.extractedSum, 11.03);
  assert.equal(r.reportTotal, 22.49);
});

test('comparePayrollToTable: שעות תואמות מסומנות כתואמות', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  const results = app.ctx.comparePayrollToTable([{ day: 2, start: '07:58', end: '19:00', rawNumbers: [11.03] }]);
  assert.equal(results[0].timesMatch, true);
});

test('comparePayrollToTable: שעות שונות מסומנות כלא תואמות', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0700', '1900');
  const results = app.ctx.comparePayrollToTable([{ day: 2, start: '07:58', end: '19:00', rawNumbers: [12] }]);
  assert.equal(results[0].timesMatch, false);
});

test('applyPayrollTime: כותבת שעות כניסה/יציאה לתא הנכון ומחשבת מחדש', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  app.ctx.applyPayrollTime(5, '07:58', '19:00');
  const times = app.doc.querySelector('#tbody tr:nth-child(5)').querySelectorAll('.time-input');
  assert.equal(times[0].value, '07:58');
  assert.equal(times[1].value, '19:00');
});

test('applyPayrollTime: ללא שעות (יום היעדרות) - לא נוגעת בתא בכלל', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 5, '0700', '1500');
  app.ctx.applyPayrollTime(5, '', '');
  assert.equal(app.doc.querySelector('#tbody tr:nth-child(5)').querySelectorAll('.time-input')[0].value, '07:00');
});

test('applyAllPayrollTimes: בלי אישור, שום תא לא משתנה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 3, '0700', '1900');
  const results = [{ day: 3, cotStart: '07:00', cotEnd: '19:00', pdfStart: '07:58', pdfEnd: '19:00', timesMatch: false }];
  app.ctx.renderPayrollComparison(results);
  app.confirms.answer = false;
  await app.ctx.applyAllPayrollTimes(results);
  assert.equal(app.doc.querySelector('#tbody tr:nth-child(3)').querySelectorAll('.time-input')[0].value, '07:00');
});

test('applyAllPayrollTimes: עם אישור, קוראת את הערך הנוכחי בשדה העריכה (כולל תיקון ידני לפני הלחיצה)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 3, '0700', '1900');
  const results = [{ day: 3, cotStart: '07:00', cotEnd: '19:00', pdfStart: '07:58', pdfEnd: '19:00', timesMatch: false }];
  app.ctx.renderPayrollComparison(results);
  app.doc.getElementById('payroll-start-3').value = '08:00';
  app.confirms.answer = true;
  await app.ctx.applyAllPayrollTimes(results);
  assert.equal(app.doc.querySelector('#tbody tr:nth-child(3)').querySelectorAll('.time-input')[0].value, '08:00');
});

test('detectPayrollDiscrepancies: רצף תקין (זהה לעמודות הלא-אפס של COT) - אין סתירות', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  const days = [{ day: 2, start: '07:58', end: '19:00', rawNumbers: [11.033333333333334, 8, 8, 2, 1.0333333333333334, 1.9666666666666666] }];
  assert.equal(app.ctx.detectPayrollDiscrepancies(days).length, 0);
});

test('detectPayrollDiscrepancies: ערך שגוי באמצע הרצף מזוהה כסתירה בעמודה הנכונה (L)', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  const days = [{ day: 2, start: '07:58', end: '19:00', rawNumbers: [11.033333333333334, 8, 8, 99, 1.0333333333333334, 1.9666666666666666] }];
  const discrepancies = app.ctx.detectPayrollDiscrepancies(days);
  assert.equal(discrepancies.length, 1);
  assert.equal(discrepancies[0].mismatches[0].col, 'L');
  assert.equal(discrepancies[0].mismatches[0].pdfVal, 99);
});

test('detectPayrollDiscrepancies: ימי היעדרות (בלי rawNumbers) לא נכנסים לניתוח', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  assert.equal(app.ctx.detectPayrollDiscrepancies([{ day: 4, start: '', end: '', rawNumbers: [] }]).length, 0);
});

test('ניתוח הסתירות מוצג רק כש-renderPayrollComparison מקבל מערך discrepancies', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  app.ctx.renderPayrollComparison([{ day: 2, cotStart: '07:58', cotEnd: '19:00', pdfStart: '07:58', pdfEnd: '19:00', timesMatch: true }]);
  assert.ok(!app.doc.getElementById('payrollCompareBody').innerHTML.includes('ניתוח סתירות'));
});

test('importPayrollForComparison: בלי pdfjsLib טעון, מציג הודעת שגיאה ידידותית ולא קורס', async () => {
  const app = loadApp();
  delete app.ctx.pdfjsLib;
  await app.ctx.importPayrollForComparison({ target: { files: [{}], value: '' } });
  assert.ok(app.alerts.some((a) => a.includes('PDF.js') || a.includes('שגיאה')));
});

test('importPayrollForComparison: מתריע כשהחודש בדוח לא תואם לחודש הפתוח ב-COT', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  app.ctx.extractPayrollPdf = async () => ({
    days: [{ day: 2, start: '07:58', end: '19:00', rawNumbers: [11.03] }],
    period: { year: 2026, month: 9 }, reportTotal: null,
  });
  await app.ctx.importPayrollForComparison({ target: { files: [{}], value: '' } });
  assert.ok(app.alerts.some((a) => a.includes('לא החודש הנכון') || a.includes('9/2026')));
});

test('index.html טוען את pdf.js ו-09-payroll-import.js', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.4\.120\/pdf\.min\.js/);
  assert.match(html, /<script src="09-payroll-import\.js(\?[^"]*)?">/);
});

test('generatePayrollUpdateRequest: בלי jsPDF/html2canvas טעונים, מציג הודעה ידידותית ולא קורס', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  delete app.ctx.jsPDF; delete app.ctx.html2canvas;
  await app.ctx.generatePayrollUpdateRequest();
  assert.ok(app.alerts.some((a) => a.includes('PDF') && a.includes('נטענה')));
});

test('generatePayrollUpdateRequest: בלי גליון פתוח, מציג הודעה ולא קורס', async () => {
  const app = loadApp();
  app.ctx.jsPDF = function () {}; app.ctx.html2canvas = async () => ({ width: 10, height: 10, toDataURL: () => 'data:x' });
  await app.ctx.generatePayrollUpdateRequest();
  assert.ok(app.alerts.some((a) => a.includes('אין גליון פתוח')));
});

test('generatePayrollUpdateRequest: גליון ריק לגמרי (בלי אף יום עם נתונים) מציג הודעה ייעודית', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  app.ctx.jsPDF = function () {}; app.ctx.html2canvas = async () => ({ width: 10, height: 10, toDataURL: () => 'data:x' });
  await app.ctx.generatePayrollUpdateRequest();
  assert.ok(app.alerts.some((a) => a.includes('אין נתונים')));
});

test('generatePayrollUpdateRequest: עם ימים ממולאים, בונה PDF בשם קובץ הנכון וכולל את החודש/שנה/שם העובד בכותרת', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let capturedEl = null, savedName = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 100, height: 50, toDataURL: () => 'data:image/jpeg;base64,X' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = (name) => { savedName = name; }; };
  await app.ctx.generatePayrollUpdateRequest();
  assert.ok(savedName && savedName.includes('2026-09'));
  assert.ok(capturedEl.innerHTML.includes('09/2026') || capturedEl.innerHTML.includes('לחודש 09/2026'));
});

test('כפתור "יבא דו"ח פיצול" נמצא ברצועת הפעולות בין "טען גליון" ל"שמור גליון"', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const loadIdx = html.indexOf('טען גליון');
  const importIdx = html.indexOf('id="importPayrollBtn"');
  const saveIdx = html.indexOf('שמור גליון');
  assert.ok(loadIdx > -1 && importIdx > -1 && saveIdx > -1);
  assert.ok(loadIdx < importIdx && importIdx < saveIdx, 'הכפתור אמור להיות בדיוק בין טען גליון לשמור גליון');
});

test('כפתור "בקשת עדכון" עדיין קיים בדשבורד הישן (מקום הייבוא הקודם)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('id="exportPayrollRequestBtn"') && html.includes('generatePayrollUpdateRequest()'));
});

test('importPayrollForComparison: אחרי ייבוא, דוח הסתירות לא מוצג (גם למשתמש מנהל)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  app.state.currentUser = { uid: 'admin1', email: 'bassam@bsbc.co.il' }; // המשתמש המנהל עצמו
  app.ctx.extractPayrollPdf = async () => ({
    days: [{ day: 2, start: '07:58', end: '19:00', rawNumbers: [11.03] }],
    period: null, reportTotal: null,
  });
  await app.ctx.importPayrollForComparison({ target: { files: [{}], value: '' } });
  assert.ok(!app.doc.getElementById('payrollCompareBody').innerHTML.includes('ניתוח סתירות'), 'דוח הסתירות לא אמור להופיע יותר אחרי ייבוא, גם למנהל');
});

test('שעות בחלון ההשוואה: כפיית LTR חזקה (direction+unicode-bidi:bidi-override), לא רק dir="ltr"', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  app.ctx.renderPayrollComparison([{ day: 2, cotStart: '07:58', cotEnd: '19:00', pdfStart: '07:58', pdfEnd: '19:00', timesMatch: true }]);
  const html = app.doc.getElementById('payrollCompareBody').innerHTML;
  const ltrCells = html.match(/<td[^>]*dir="ltr"[^>]*>/g) || [];
  assert.ok(ltrCells.length >= 2, 'אמורים להיות לפחות 2 תאי שעות עם dir="ltr"');
  for (const cell of ltrCells) {
    assert.ok(cell.includes('unicode-bidi:bidi-override'), cell);
    assert.ok(cell.includes('direction:ltr'), cell);
  }
});

test('generatePayrollUpdateRequest: שורה שהשתנתה מהדוח שנסרק מסומנת (רקע שונה)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0700', '1900'); // המשתמש שינה ל-07:00 אחרי שהדוח אמר 07:58
  app.ctx.__lastPayrollCompareResults = [{ day: 2, pdfStart: '07:58', pdfEnd: '19:00' }];
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.generatePayrollUpdateRequest();
  const row2 = capturedEl.innerHTML.split('<tr').find((r) => r.includes('02/09'));
  assert.ok(row2 && row2.includes('#F3E8DA'), 'שורה שהשתנתה אמורה להיות מסומנת ברקע אמבר');
});

test('generatePayrollUpdateRequest: שורה שלא השתנתה מהדוח שנסרק לא מסומנת', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0758', '1900'); // זהה למה שהדוח אמר
  app.ctx.__lastPayrollCompareResults = [{ day: 2, pdfStart: '07:58', pdfEnd: '19:00' }];
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.generatePayrollUpdateRequest();
  const row2 = capturedEl.innerHTML.split('<tr').find((r) => r.includes('02/09'));
  assert.ok(row2 && !row2.includes('#F3E8DA'));
});

test('generatePayrollUpdateRequest: בלי סריקה קודמת בסשן, אף שורה לא מסומנת כ"שונתה" (אין שגיאה)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 2, '0700', '1900');
  app.ctx.__lastPayrollCompareResults = undefined;
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.generatePayrollUpdateRequest();
  const dataRows = capturedEl.innerHTML.split('<tr').slice(1); // מדלגים על שורת הכותרת של הטבלה
  assert.ok(!dataRows.some((r) => r.includes('#F3E8DA')), 'בלי דוח שנסרק להשוואה, אין בסיס לסמן "שונה"');
});

test('generatePayrollUpdateRequest: יום היעדרות (בלי שעות) מסומן בצבע ההיעדרות', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  const { setShiftCode } = require('./helpers/loadApp');
  setShiftCode(app, 8, 'ח'); // 8/9/2026 הוא יום שלישי - יום חול תקין לקוד 'ח'
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.generatePayrollUpdateRequest();
  const row = capturedEl.innerHTML.split('<tr').find((r) => r.includes('08/09'));
  assert.ok(row && row.includes('#F3E8FF'), 'שורת ההיעדרות אמורה להיות מסומנת');
});
