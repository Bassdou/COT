'use strict';
// הבדיקות כאן ממוקדות בלוגיקת התזמור (מה קורה לפני/אחרי הצילום) - לא יכולות לבדוק שה-HTML
// שמצטלם אכן נראה טוב (זה דורש דפדפן אמיתי), אבל כן מוודאות שמצב התצוגה משוחזר נכון, ושקריסה
// של הספרייה לא משאירה את הטבלה "תקועה" במצב ביניים.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, setupMonth, setShiftCode } = require('./helpers/loadApp');

function fakeCanvas() {
  return { width: 1000, height: 500, toDataURL: () => 'data:image/jpeg;base64,FAKE' };
}

test('exportToPDF: אם jsPDF או html2canvas לא נטענו, מוצגת הודעה ידידותית ולא נזרקת שגיאה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  delete app.ctx.jsPDF; delete app.ctx.html2canvas;
  await app.ctx.exportToPDF();
  assert.ok(app.alerts.some((a) => a.includes('PDF') && a.includes('נטענה')));
});

test('exportToPDF: בלי גליון פתוח (tableContainer מוסתר), מוצגת הודעה ולא קורסת', async () => {
  const app = loadApp();
  app.ctx.jsPDF = function () {};
  app.ctx.html2canvas = async () => fakeCanvas();
  await app.ctx.exportToPDF();
  assert.ok(app.alerts.some((a) => a.includes('אין גליון פתוח')));
});

test('exportToPDF: בזמן הצילום מבטלים זמנית תצוגה פשוטה, ואז משחזרים אותה כפי שהייתה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setShiftCode(app, 3, 'ב06');
  const tc = app.doc.getElementById('tableContainer');
  tc.classList.add('simple-view');

  let sawSimpleDuringCapture = null;
  const saveCalls = [];
  app.ctx.html2canvas = async (el) => { sawSimpleDuringCapture = el.classList.contains('simple-view'); return fakeCanvas(); };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = (name) => saveCalls.push(name); };

  await app.ctx.exportToPDF();

  assert.equal(sawSimpleDuringCapture, false, 'בזמן הצילום עצמו, כל 25 העמודות צריכות להיות גלויות');
  assert.equal(tc.classList.contains('simple-view'), true, 'אחרי הייצוא, המצב חוזר לקדמותו');
  assert.equal(saveCalls.length, 1);
  assert.match(saveCalls[0], /^COT_משמרות_.*_2026-10\.pdf$/);
});

test('exportToPDF: תצוגה פשוטה גם משוחזרת נכון אם לא הייתה פעילה מלכתחילה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  const tc = app.doc.getElementById('tableContainer');
  tc.classList.remove('simple-view');
  app.ctx.html2canvas = async () => fakeCanvas();
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.exportToPDF();
  assert.equal(tc.classList.contains('simple-view'), false);
});

test('exportToPDF: שגיאה בתוך הצילום עדיין משחזרת את מצב התצוגה (finally)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  const tc = app.doc.getElementById('tableContainer');
  tc.classList.add('simple-view');
  app.ctx.html2canvas = async () => { throw new Error('boom'); };
  app.ctx.jsPDF = function () {};
  await app.ctx.exportToPDF();
  assert.equal(tc.classList.contains('simple-view'), true, 'גם אחרי שגיאה, המצב חוזר לקדמותו');
  assert.ok(app.alerts.some((a) => a.includes('שגיאה')));
});

test('index.html טוען jsPDF ו-html2canvas מ-CDN, וגם את 08-pdf-export.js; אין יותר תלות ב-autotable', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/);
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/);
  assert.match(html, /<script src="08-pdf-export\.js">/);
  assert.ok(!html.includes('jspdf-autotable'), 'autoTable לא יודע לצייר עברית - לא אמור להישאר בשימוש');
});
