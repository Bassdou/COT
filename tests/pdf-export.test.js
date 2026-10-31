'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, setupMonth, setShiftCode, setTimes } = require('./helpers/loadApp');

test('buildPdfTableData: הכותרת כוללת 25 עמודות עם הקבצות נכונות (ש"נ/שבת/ש"נ/ת.מ.)', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  const table = app.ctx.buildPdfTableData({ y: 2026, m: 10 });
  const row1 = table.head[0];
  assert.equal(row1[0].content, 'תאריך');
  assert.equal(row1[0].colSpan, 2);
  assert.equal(row1.filter((c) => c.content === 'ש"נ').length, 2); // שתי קבוצות "ש"נ" נפרדות
  assert.equal(table.head[1].length, 14); // 14 כותרות אחוז בשורה השנייה
});

test('buildPdfTableData: שורות ריקות (בלי משמרת/תאור) לא נכנסות לטבלה', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setShiftCode(app, 3, 'ב');
  const table = app.ctx.buildPdfTableData({ y: 2026, m: 10 });
  assert.equal(table.body.length, 1);
  assert.equal(table.body[0][0], '03');
});

test('buildPdfTableData: ערכי משמרת אמיתית מופיעים בעמודות הנכונות (תאריך, יום, משמרת, שעות)', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 12, '0700', '1500');
  const table = app.ctx.buildPdfTableData({ y: 2026, m: 10 });
  const r = table.body[0];
  assert.equal(r[0], '12');
  assert.equal(r[3], '07:00');
  assert.equal(r[4], '15:00');
  assert.ok(typeof r[6] === 'number' && r[6] > 0, 'סה"כ שעות אמור להיות מספר חיובי');
});

test('exportToPDF: אם jsPDF לא נטען, מוצגת הודעה ידידותית ולא נזרקת שגיאה', async () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  delete app.ctx.jsPDF;
  await app.ctx.exportToPDF();
  assert.ok(app.alerts.some((a) => a.includes('PDF') && a.includes('נטענה')));
});

test('index.html טוען את jsPDF ו-autotable מ-CDN, וגם את 08-pdf-export.js', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/);
  assert.match(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf-autotable\/3\.8\.2\/jspdf\.plugin\.autotable\.min\.js/);
  assert.match(html, /<script src="08-pdf-export\.js">/);
});
