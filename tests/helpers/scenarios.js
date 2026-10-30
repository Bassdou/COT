'use strict';
// תרחישי "תמונת מצב" (golden): מריצים את הקוד האמיתי על מגוון משמרות ומחזירים את כל התוצאות.
const fs = require('fs');
const path = require('path');
const { loadApp, setupMonth, readDay, setShiftCode, setTimes, clearDay, ROOT, SPLIT_FILES } = require('./loadApp');

const MONTHS = [[2026, 3], [2026, 4], [2026, 5], [2026, 9], [2026, 10], [2026, 12]];
const MANUAL_MONTHS = [[2026, 3], [2026, 9], [2026, 10]];
const ABSENCE = ['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ', 'הס', 'מיל'];
const MANUAL = [
  ['0600', '1500'], ['0600', '1659'], ['0600', '1700'], ['0700', '1900'], ['1000', '2000'], ['1400', '1700'],
  ['1300', '2215'], ['2200', '0600'], ['2000', '0700'], ['2300', '0900'], ['1800', '0200'], ['0000', '0800'],
  ['0800', '2000'], ['1500', '2300'],
];

// קודי המשמרות נשלפים מ-window.SHIFT_CODES (01-shift-codes.js), כדי שלא יהיו שני מקורות לרשימת הקודים.
function shiftCodesFrom(files) {
  const probe = loadApp({ files });
  const codes = Object.keys(probe.ctx.SHIFT_CODES || probe.ctx.window.SHIFT_CODES);
  if (!codes.length) throw new Error('לא נמצא window.SHIFT_CODES - בדוק את סדר טעינת הקבצים');
  return codes;
}

const pad = (n) => String(n).padStart(2, '0');
const daysIn = (y, m) => new Date(y, m, 0).getDate();

function computeShiftEntries(files) {
  files = files || SPLIT_FILES;
  const codes = shiftCodesFrom(files);
  const entries = {};
  for (const [y, m] of MONTHS) {
    const app = loadApp({ files });
    setupMonth(app, { year: y, month: m, rate: 50 });
    const n = daysIn(y, m);
    const record = (key, day, action) => {
      const before = app.alerts.length;
      action();
      const r = readDay(app, day);
      entries[key] = [r.total, r.shab, r.I, r.I2, r.J, r.K, r.L, r.M, r.N, r.O, r.P, r.Q, r.R, r.S, r.T, r.U, r.V, r.W,
        r.cost, r.gross, r.isShift, r.desc, r.shiftInput, app.alerts.length - before];
      clearDay(app, day);
    };
    for (let d = 1; d <= n; d++) {
      const date = y + '-' + pad(m) + '-' + pad(d);
      for (const c of codes) record(date + '|' + c, d, () => setShiftCode(app, d, c));
      for (const c of ABSENCE) record(date + '|' + c, d, () => setShiftCode(app, d, c));
      if (MANUAL_MONTHS.some(([my, mm]) => my === y && mm === m)) {
        for (const [a, b] of MANUAL) record(date + '|T' + a + '-' + b, d, () => setTimes(app, d, a, b));
      }
    }
  }
  return entries;
}

const ROSTER_CYCLE = ['ב', 'ב', 'ל', '', '', '227', '615', '102', '', '217'];
const SUMMARY_SCENARIOS = [
  { name: 'oct-2026-mixed', year: 2026, month: 10, rate: 41.75, eshel: 52.66, carry: 2,
    open: { reg: 10.5, shab: 1, sick: 5, dec: 3, cho: 2 },
    overrides: { 8: 'ח', 9: 'מח', 12: 'חש', 15: 'הצ', 16: 'בח', 21: 'מבמ', 22: 'הס', 27: 'מיל', 28: 'מיל' } },
  { name: 'sep-2026-holidays', year: 2026, month: 9, rate: 55.3, eshel: 55, carry: 0,
    open: { reg: 4, shab: -1, sick: 8, dec: 1, cho: 1 }, overrides: { 6: 'ח', 7: 'מח' } },
  { name: 'apr-2026-too-many-shifts', year: 2026, month: 4, rate: 38, eshel: 52.66, carry: 3,
    open: { reg: 0, shab: 0, sick: 0, dec: 0, cho: 0 }, all: 'ב', overrides: {} },
  { name: 'mar-2026-dst-spring', year: 2026, month: 3, rate: 60, eshel: 52.66, carry: 1,
    open: { reg: 2, shab: 2, sick: 2, dec: 2, cho: 2 }, overrides: { 26: '227', 27: 'ל' } },
];

function computeMonthSummaries(files) {
  files = files || SPLIT_FILES;
  const out = {};
  for (const sc of SUMMARY_SCENARIOS) {
    const app = loadApp({ files });
    setupMonth(app, { year: sc.year, month: sc.month, rate: sc.rate, eshel: sc.eshel, carry: sc.carry, openBalances: sc.open });
    const n = daysIn(sc.year, sc.month);
    for (let d = 1; d <= n; d++) {
      const code = sc.overrides[d] !== undefined ? sc.overrides[d] : (sc.all || ROSTER_CYCLE[(d - 1) % ROSTER_CYCLE.length]);
      if (code) setShiftCode(app, d, code);
    }
    const snap = {};
    for (const [id, el] of Array.from(app.doc.registry.entries()).sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (/^(sum-|dash|bal_|tbl_|tlush|printDash|weeklyWarning)/.test(id)) {
        snap[id] = String(el.innerText || el.value || '').replace(/\s+/g, ' ').trim() + (id === 'weeklyWarning' ? ' [display=' + (el.style.display || '') + ']' : '');
      }
    }
    snap.__alerts = app.alerts.length;
    out[sc.name] = snap;
  }
  return out;
}

function writeGolden(entries, summaries, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const lines = Object.keys(entries).map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(entries[k]));
  fs.writeFileSync(path.join(dir, 'shifts.json'), '{\n' + lines.join(',\n') + '\n}\n');
  fs.writeFileSync(path.join(dir, 'month-summaries.json'), JSON.stringify(summaries, null, 1) + '\n');
}

module.exports = { computeShiftEntries, computeMonthSummaries, writeGolden, shiftCodesFrom, ROOT, MONTHS, ABSENCE, MANUAL };
