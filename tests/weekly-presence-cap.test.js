'use strict';
// כלל: לכל היותר 4 משמרות נוכחות מתוך 5 המותרות בשבוע קלנדרי (שאר ה-5 חייבות להיות היעדרות).
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setupMonth, setShiftCode, row } = require('./helpers/loadApp');

test('4 נוכחות + 1 חופש באותו שבוע - כולן מתקבלות', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 }); // 1/10/2026 = יום חמישי
  // שבוע ראשון: ה,ו,ש (1,2,3) + א-ד הבאים (4,5,6,7) = עד 7 ימים, ניקח 4,5,6,7 כנוכחות ו-1 כחופש
  setShiftCode(app, 1, 'ח');
  setShiftCode(app, 4, 'ב06'); setShiftCode(app, 5, 'ב06'); setShiftCode(app, 6, 'ב06'); setShiftCode(app, 7, 'ב06');
  for (const d of [4, 5, 6, 7]) assert.equal(row(app, d).querySelector('.shift-type-input').value, 'ב06', 'יום ' + d + ' לא אמור להיחסם');
  assert.equal(app.alerts.length, 0);
});

test('5 נוכחות רצופות ללא היעדרות בתוך שבוע קלנדרי אחד - החמישית נחסמת', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 }); // שבוע 4-10/10 (א'-ש')
  setShiftCode(app, 4, 'ב06'); setShiftCode(app, 5, 'ב06'); setShiftCode(app, 6, 'ב06'); setShiftCode(app, 7, 'ב06');
  setShiftCode(app, 8, 'ב06');
  assert.equal(row(app, 8).querySelector('.shift-type-input').value, '', 'משמרת הנוכחות החמישית אמורה להימחק אוטומטית');
  assert.ok(app.alerts.includes('אין להזין יותר מ-4 משמרות בסידור'));
});

test('משמרות נגררות מהחודש הקודם נספרות לתוך תקרת ה-4 בשבוע הראשון', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50, carry: 2 }); // 2 משמרות נגררות + שבוע ראשון קצר (1-3)
  setShiftCode(app, 1, 'ב06'); setShiftCode(app, 2, 'ב06');
  assert.equal(row(app, 1).querySelector('.shift-type-input').value, 'ב06');
  setShiftCode(app, 3, 'ב06'); // 2(נגרר)+2(כבר הוזנו)=4, זו הנוכחות החמישית -> נחסמת
  assert.equal(row(app, 3).querySelector('.shift-type-input').value, '', 'עם 2 משמרות נגררות, רק עוד 2 נוכחות מותרות באותו שבוע');
});

test('מילואים ביום חול נספר כהיעדרות - לא תופס מקום מתוך ה-4, ומאפשר 4 נוכחות + מיל', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setShiftCode(app, 4, 'ב06'); setShiftCode(app, 5, 'ב06'); setShiftCode(app, 6, 'ב06'); setShiftCode(app, 7, 'ב06');
  setShiftCode(app, 8, 'מיל'); // יום חול - אמור להיכנס כהיעדרות, לא לחסום
  assert.equal(row(app, 8).querySelector('.shift-type-input').value, 'מיל');
});

test('היעדרות (לא נוכחות) לא נחסמת ע"י הכלל הזה גם אם כבר יש 4 נוכחות באותו שבוע', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setShiftCode(app, 4, 'ב06'); setShiftCode(app, 5, 'ב06'); setShiftCode(app, 6, 'ב06'); setShiftCode(app, 7, 'ב06');
  setShiftCode(app, 8, 'ח'); // היעדרות, לא נוכחות - לא אמורה להיחסם ע"י הכלל של 4 הנוכחות
  assert.equal(row(app, 8).querySelector('.shift-type-input').value, 'ח');
});

test('ההקלדה הישירה של שעות כניסה/יציאה (בלי קוד משמרת) נספרת כנוכחות בדיוק כמו קוד', () => {
  const app = loadApp();
  setupMonth(app, { year: 2026, month: 10, rate: 50 });
  setShiftCode(app, 4, 'ב06'); setShiftCode(app, 5, 'ב06'); setShiftCode(app, 6, 'ב06'); setShiftCode(app, 7, 'ב06');
  const tr = row(app, 8);
  const [startEl, endEl] = tr.querySelectorAll('.time-input');
  startEl.value = '07:00'; endEl.value = '15:00';
  app.ctx.calculateRow(startEl);
  assert.equal(startEl.value, '', 'הקשה ידנית של שעות ללא קוד אמורה להיחסם באותו אופן בדיוק');
  assert.ok(app.alerts.includes('אין להזין יותר מ-4 משמרות בסידור'));
});
