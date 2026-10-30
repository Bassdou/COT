'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'holidays_db.js'), 'utf8'), ctx);
const DB = ctx.window.HOLIDAYS_DB;
const TYPES = ['agreed_vacation', 'choice', 'eve', 'holiday', 'cholhamoed'];

test('מבנה מסד החגים תקין', () => {
  const errors = [];
  for (const [k, v] of Object.entries(DB)) {
    const m = k.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) { errors.push(k + ': פורמט תאריך'); continue; }
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) errors.push(k + ': תאריך לא קיים');
    if (!TYPES.includes(v.type)) errors.push(k + ': סוג לא מוכר ' + v.type);
    if (!v.hebrew || !String(v.hebrew).trim()) errors.push(k + ': חסר שם בעברית');
    if (['eve', 'cholhamoed'].includes(v.type) && !(typeof v.standardHours === 'number' && v.standardHours > 0 && v.standardHours <= 8)) errors.push(k + ': standardHours חסר או לא סביר');
  }
  assert.deepEqual(errors, []);
});

test('ערבי חג וחול המועד מוגדרים עם שעות תקן (standardHours)', () => {
  for (const [k, v] of Object.entries(DB)) if (v.type === 'eve') assert.equal(typeof v.standardHours, 'number', k);
});

// תזכורת: מועדי השנה הבאה מתפרסמים בסוף השנה הקודמת. עד אז - אין צורך/אפשרות לעדכן, והמערכת ממשיכה
// לעבוד כרגיל (יום בלי ערך ב-holidays_db.js פשוט נחשב יום חול). הבדיקה הופכת לכשל אמיתי רק מ-15.12,
// נותן כחודש וחצי שוליים אחרי הפרסום הצפוי של מועדי השנה הבאה, לפני שהיא "צועקת".
const year = new Date().getFullYear();
const needs = Date.now() >= new Date(year, 11, 15).getTime();
test('מסד החגים כולל את השנה הבאה', { todo: needs ? false : `להוסיף את חגי ${year + 1} כשיתפרסמו (בד"כ בסוף ${year})` }, () => {
  assert.ok(Object.keys(DB).some((k) => k.startsWith(String(year + 1) + '-')), 'אין אף תאריך של ' + (year + 1) + ' ב-holidays_db.js');
});
