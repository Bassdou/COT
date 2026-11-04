'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, setupMonth, setShiftCode, setTimes } = require('./helpers/loadApp');

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
  app.ctx.html2canvas = async () => ({ width: 10, height: 10, toDataURL: () => 'data:x' });
  await app.ctx.exportToPDF();
  assert.ok(app.alerts.some((a) => a.includes('אין גליון פתוח')));
});

test('exportToPDF: גליון ריק לגמרי (בלי אף יום עם נתונים) מציג הודעה ייעודית', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  app.ctx.jsPDF = function () {};
  app.ctx.html2canvas = async () => ({ width: 10, height: 10, toDataURL: () => 'data:x' });
  await app.ctx.exportToPDF();
  assert.ok(app.alerts.some((a) => a.includes('אין נתונים')));
});

test('exportToPDF: עם ימים ממולאים, בונה טבלה בסגנון דוח השכר (כותרת "לתקופה", כל 16 עמודות השעות) ושומר עם שם קובץ נכון', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let capturedEl = null, savedName = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 100, height: 50, toDataURL: () => 'data:image/jpeg;base64,X' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = (name) => { savedName = name; }; };
  await app.ctx.exportToPDF();
  assert.ok(savedName && savedName.includes('2026-10'));
  assert.ok(capturedEl.innerHTML.includes('לתקופה: 10 / 2026'));
  assert.ok(capturedEl.innerHTML.includes('150%') && capturedEl.innerHTML.includes('87.5%'), 'אמורות להופיע כל עמודות האחוזים, כמו בדוח האמיתי');
  assert.ok(capturedEl.innerHTML.includes('סה"כ שעות:'), 'שורת הסיכום בתחתית חסרה');
});

test('exportToPDF: יום ריק (בלי שעות/תיאור/קוד) לא נכלל בטבלה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.exportToPDF();
  assert.ok(!capturedEl.innerHTML.includes('>03<'), 'יום 3 ריק לא היה אמור להופיע');
});

test('index.html טוען jsPDF ו-html2canvas מ-CDN, וגם את 08-pdf-export.js; אין תלות ב-autotable', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/);
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas\/1\.4\.1\/html2canvas\.min\.js/);
  assert.match(html, /<script src="08-pdf-export\.js(\?[^"]*)?">/);
  assert.ok(!html.includes('jspdf-autotable'));
});

test('exportToPDF: קונטיינר רחב מספיק לכל 23 העמודות, וקווי תיחום מלאים בכל תא (לא רק קו תחתון)', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let capturedEl = null, captureOpts = null;
  app.ctx.html2canvas = async (el, opts) => { capturedEl = el; captureOpts = opts; return { width: 100, height: 50, toDataURL: () => 'data:image/jpeg;base64,X' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.exportToPDF();
  assert.ok(capturedEl.style.cssText.includes('1600px'), 'הקונטיינר אמור להיות רחב מספיק (לא 1000px הישן שגרם לחיתוך)');
  assert.ok(capturedEl.innerHTML.includes('border:1px solid #333'), 'כל תא אמור לקבל קו תיחום מלא, לא רק border-bottom');
  // scrollWidth לא קיים ב-fake DOM שלנו (רק בדפדפן אמיתי), אז רק מוודאים שהמפתחות עצמם מועברים
  assert.ok(captureOpts && 'width' in captureOpts && 'windowWidth' in captureOpts, 'html2canvas אמור לקבל width/windowWidth מפורשים כדי לא לחתוך תוכן שחורג מהמסך');
});

test('exportToPDF: jsPDF נקרא עם orientation landscape', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let jsPdfArgs = null;
  app.ctx.html2canvas = async () => ({ width: 100, height: 50, toDataURL: () => 'data:x' });
  app.ctx.jsPDF = function (opts) { jsPdfArgs = opts; this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.exportToPDF();
  assert.equal(jsPdfArgs.orientation, 'landscape');
});

test('exportToPDF: שעות בלי כפיית כיווניות - bidi-override גרם להיפוך שדווח, הוסר', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0758', '1900');
  let capturedEl = null;
  app.ctx.html2canvas = async (el) => { capturedEl = el; return { width: 10, height: 10, toDataURL: () => 'data:x' }; };
  app.ctx.jsPDF = function () { this.addImage = () => {}; this.save = () => {}; };
  await app.ctx.exportToPDF();
  assert.ok(!capturedEl.innerHTML.includes('unicode-bidi:bidi-override'));
  assert.ok(!capturedEl.innerHTML.includes('dir="ltr"'));
});
