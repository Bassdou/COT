'use strict';
// יוצר מחדש את קבצי ה-golden מתוך קוד החישוב הנוכחי (המפוצל).
// חשוב: להריץ רק לאחר שינוי מכוון בנוסחה - שינוי ה-golden "מבלע" כל הוכחה לאי-שינוי!
// שימוש:  node tests/generate-golden.js
const path = require('path');
const { computeShiftEntries, computeMonthSummaries, writeGolden } = require('./helpers/scenarios');
console.log('מחשב תמונת מצב מהקוד הנוכחי (הקבצים המפוצלים)...');
const t0 = Date.now();
const entries = computeShiftEntries();
const summaries = computeMonthSummaries();
writeGolden(entries, summaries, path.join(__dirname, 'golden'));
console.log('נשמרו', Object.keys(entries).length, 'תרחישי יום ו-', Object.keys(summaries).length, 'סיכומי חודש ב-', ((Date.now() - t0) / 1000).toFixed(1), 'שניות');
