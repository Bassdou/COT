'use strict';
// הבדיקה החשובה ביותר: הקוד המפוצל נותן בדיוק את אותן תוצאות חישוב כמו הקוד המקורי החד-קבצי.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { computeShiftEntries, computeMonthSummaries } = require('./helpers/scenarios');

const GOLDEN = path.join(__dirname, 'golden');
const COLS = ['total', 'shab', 'I', 'I2', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'cost', 'gross', 'isShift', 'desc', 'shiftInput', 'alerts'];

test('חישוב שורת יום: כל הקודים × כל ימי החודשים נבחרים (כולל חגים ומעבר שעון)', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'shifts.json'), 'utf8'));
  const actual = JSON.parse(JSON.stringify(computeShiftEntries()));
  const keys = Object.keys(golden);
  assert.equal(Object.keys(actual).length, keys.length, 'מספר התרחישים השתנה');
  const bad = [];
  for (const k of keys) {
    if (JSON.stringify(actual[k]) !== JSON.stringify(golden[k])) {
      const diffs = COLS.map((c, i) => (actual[k] && actual[k][i] !== golden[k][i] ? c + ': ציפייה ' + golden[k][i] + ' בפועל ' + (actual[k] && actual[k][i]) : null)).filter(Boolean);
      bad.push(k + '  →  ' + diffs.join(' | '));
    }
  }
  assert.equal(bad.length, 0, bad.length + ' תרחישים השתנו. לדוגמה:\n' + bad.slice(0, 10).join('\n'));
});

test('סיכומי חודש: לוח סיכומים, אש"ל, יתרות והתראת 5 משמרות', () => {
  const golden = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'month-summaries.json'), 'utf8'));
  const actual = JSON.parse(JSON.stringify(computeMonthSummaries()));
  for (const name of Object.keys(golden)) {
    const bad = Object.keys(golden[name]).filter((k) => golden[name][k] !== actual[name][k])
      .map((k) => k + ': ציפייה "' + golden[name][k] + '" בפועל "' + actual[name][k] + '"');
    assert.equal(bad.length, 0, name + ':\n' + bad.slice(0, 10).join('\n'));
  }
});

test('מעבר שעון (24-25/10/2026, חורף): COT לא מוסיף/מחסיר שעה בעצמו - בדיוק כמו מחלקת השכר, מחשב נומינלית ממה שהוזן, רק מוסיף הערה', () => {
  const { loadApp, setupMonth, setTimes } = require('./helpers/loadApp');
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 41.75 });
  // ההחתמה הפיזית האמיתית הייתה 07:00, אבל מחלקת השכר (ו-COT, מעכשיו) רושמים/מחשבים ממה שמוזן
  // ממש - אם המשתמש מזין 07:00 (כמו ההחתמה האמיתית), מקבלים 12 שעות נומינליות, לא 13.
  setTimes(app, 24, '1900', '0700');
  assert.strictEqual(parseFloat(app.doc.getElementById('val-total-hours-24').getAttribute('data-val')), 12, 'ללא כל התאמת DST - נומינלי בלבד, בדיוק כמו שהוזן');
  assert.match(app.doc.getElementById('val-desc-24').innerHTML, /שעון חורף/, 'הערת מעבר השעון עדיין אמורה להופיע, גם בלי שינוי בחישוב');

  // אם המשתמש מזין את הזמן כפי שמחלקת השכר מציגה אותו (08:00, כבר "מוזז") - מקבלים 13, תואם לשכר בדיוק
  const app2 = loadApp();
  setupMonth(app2, { year: 2026, month: 10, rate: 41.75 });
  setTimes(app2, 24, '1900', '0800');
  assert.strictEqual(parseFloat(app2.doc.getElementById('val-total-hours-24').getAttribute('data-val')), 13, 'הזנת שעת היציאה כפי שמחלקת השכר מציגה אותה אמורה לתת את אותו הסכום בדיוק, בלי שום התאמה נוספת של COT');
});

test('יום שישי שהוא גם ערב חג (02/10/2026, הושענ"ר - ערב שמחת תורה): חופש שבת מקבל זיכוי על חלק המשמרת שחוצה לתוך השבת, בלי לגעת בחלוקת I/J/K/L המאומתת', () => {
  const { loadApp, setupMonth, setTimes } = require('./helpers/loadApp');
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setTimes(app, 2, '0700', '1900'); // 07:00-19:00, 2 שעות (17:00-19:00) בתוך חלון השבת של החורף
  assert.strictEqual(parseFloat(app.doc.getElementById('val-shabbat-hours-2').getAttribute('data-val')), 0.25, '2 שעות שבת = 120 דקות / 60 / 8 = 0.25 ימים');
  // I/J/K/L/O נשארים מהנוסחה המאומתת של ערב-חג-יום-שישי, בלי שום שינוי
  assert.strictEqual(parseFloat(app.doc.getElementById('val-I-2').getAttribute('data-val')), 5.5);
  assert.strictEqual(parseFloat(app.doc.getElementById('val-J-2').getAttribute('data-val')), 1);
  assert.strictEqual(parseFloat(app.doc.getElementById('val-K-2').getAttribute('data-val')), 2);
  assert.strictEqual(parseFloat(app.doc.getElementById('val-L-2').getAttribute('data-val')), 3.5);
});
