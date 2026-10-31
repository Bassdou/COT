'use strict';
// נעילת תיקון סף השעות הנוספות בערב חג (לא יום שישי, לא משמרת לילה), מאומת מול שתי דוגמאות
// אמיתיות ממחלקת השכר - ראו README / הערות calculator.js לפירוט המלא. בכוונה בודק רק את שני
// המקרים שאומתו בפועל, ולא מנחש התנהגות למקרים שלא אומתו (ליל ערב חג, חוה"מ וכו').
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setupMonth, setTimes, readDay } = require('./helpers/loadApp');

test('ערב יום כיפור (לא יום שישי) - 06:51-15:00 ב-20/9/2026: 4.5 תקן + 3.5 ב-100% + 0.15 ב-125%, אפס ב-150%', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 20, '0651', '1500');
  const r = readDay(app, 20);
  assert.equal(r.I, 4.5);
  assert.equal(r.J, 3.5);
  assert.equal(r.K, 0.15);
  assert.equal(r.L, 0);
  assert.equal(r.total, 8.15);
});

test('ערב ראש השנה ביום שישי (לא מושפע מהתיקון) - 06:59-18:00 ב-11/9/2026: 5.5 תקן + 1 ב-100% + 2 ב-125% + 2.52 ב-150%/180%', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 9, rate: 50 });
  setTimes(app, 11, '0659', '1800');
  const r = readDay(app, 11);
  assert.equal(r.I, 5.5);
  assert.equal(r.J, 1);
  assert.equal(r.K, 2);
  assert.equal(Number(r.L.toFixed(2)), 2.52);
  assert.equal(Number(r.O.toFixed(2)), 2.52);
});

test('יום חול רגיל (בלי חג) - אין קטגוריית 100% נפרדת, לא מושפע מהתיקון', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 6, rate: 50 }); // יוני - אין חג/ערב חג
  setTimes(app, 15, '0700', '1800'); // 11 שעות (חלקן אחה"צ, תוספת 20% רלוונטית - לא בודקים כאן את הפיזור המדויק בין 125%/150%, רק שאין J)
  const r = readDay(app, 15);
  assert.equal(r.total, 11);
  assert.equal(r.I, 8, 'עד 8 שעות - הכל תקן');
  assert.equal(r.J, 0, 'ביום רגיל כל השעות עד 8h הן תקן (I), אין קטגוריית 100% נפרדת');
});
