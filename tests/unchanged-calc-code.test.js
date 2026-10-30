'use strict';
// מוודא שהפיצול לקבצים לא שינה את הקבועים והחישוב עצמו - לא רק את התוצאה המספרית (שנבדקת ב-calc.golden.test.js),
// אלא גם שהערכים שהוצאו לקבועים משותפים (SHIFT_CODES / ABSENCE_CODES) זהים למה שהיה מוטבע בקוד המקורי.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadApp, SPLIT_FILES } = require('./helpers/loadApp');

const root = path.join(__dirname, '..');
const origSrc = fs.readFileSync(path.join(root, 'reference', 'calculator.original.js'), 'utf8');

// השוואה ע"י JSON (ולא assert.deepEqual): הערכים מגיעים משני "realms" שונים של Node (vm context נפרד
// לעומת ה-process הראשי), ול-deepEqual יש בעיה עם זהות אובייקטים חוצת-realm גם כשהתוכן זהה.
const sameJson = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

test('columnsData (מקדמי העמודות) זהה למקור', () => {
  const m = origSrc.match(/var columnsData = \[[\s\S]*?\];/);
  assert.ok(m, 'לא נמצא columnsData במקור');
  const expected = JSON.parse(JSON.stringify(new Function('return ' + m[0].replace('var columnsData = ', '').replace(/;$/, ''))()));
  const app = loadApp({ files: SPLIT_FILES });
  sameJson(app.ctx.columnsData, expected);
});

test('ABSENCE_CODES תואם בדיוק את הרשימה המקורית', () => {
  const app = loadApp({ files: SPLIT_FILES });
  sameJson(app.ctx.ABSENCE_CODES, ['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ', 'הס', 'מיל']);
});

test('WEEKEND_BLOCKED_ABSENCE_CODES = כל קודי ההיעדרות למעט מח ומיל', () => {
  const app = loadApp({ files: SPLIT_FILES });
  sameJson(app.ctx.WEEKEND_BLOCKED_ABSENCE_CODES, ['ח', 'חש', 'הצ', 'בח', 'מבמ', 'הס']);
});

test('SHIFT_CODES (מילון קודי המשמרת המהירים) תואם בדיוק את המילון המקורי', () => {
  const m = origSrc.match(/var shifts = (\{[^}]*\});/);
  assert.ok(m, 'לא נמצא מילון קודי משמרת במקור');
  const expected = JSON.parse(JSON.stringify(new Function('return ' + m[1])()));
  const app = loadApp({ files: SPLIT_FILES });
  sameJson(app.ctx.SHIFT_CODES, expected);
});

test('MINIMUM_ESHEL_RATE ו-SECURITY_DEADLINE זהים למקור', () => {
  const app = loadApp({ files: SPLIT_FILES });
  assert.equal(app.ctx.__evalInContext('MINIMUM_ESHEL_RATE'), 52.66);
  assert.equal(app.ctx.__evalInContext('SECURITY_DEADLINE.getTime()'), new Date('2026-11-15T00:00:00').getTime());
});
