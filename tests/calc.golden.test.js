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
