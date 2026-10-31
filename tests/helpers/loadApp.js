'use strict';
// טעינת האפליקציה האמיתית (כל קבצי המודולים, לפי סדר הטעינה שב-index.html) לתוך סביבת Node מבודדת.
process.env.TZ = 'Asia/Jerusalem'; // כמו המשתמשים; חייב להיקבע לפני יצירת תאריכים

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createFakeDocument } = require('./fakeDom');

const ROOT = path.resolve(__dirname, '..', '..');

// סדר הטעינה האמיתי של האפליקציה המפוצלת (כפי שמופיע ב-index.html), לא כולל holidays_db.js (נטען תמיד בנפרד).
const SPLIT_FILES = [
  '00-core.js', '01-shift-codes.js', 'calculator.js', '02-ui-dialogs.js', '03-auth.js', '05-session-data.js', '06-excel-export.js', '07-version-manager.js', '08-pdf-export.js',
];
// קובץ המקור המקורי (חד-קבצי, לפני הפיצול) - משמש רק להשוואה/רגרסיה.
const ORIGINAL_FILE = ['reference/calculator.original.js'];

function loadApp(opts = {}) {
  const files = opts.files || SPLIT_FILES;
  const doc = createFakeDocument();

  // select חודש/שנה
  const sel = doc.getElementById('monthYearSelect');
  sel.options = [];
  sel.add = (o) => { sel.options.push(o); if (o.selected) sel._value = o.value; };
  Object.defineProperty(sel, 'selectedIndex', {
    get() { const i = sel.options.findIndex((o) => o.value === sel.value); return i < 0 ? 0 : i; },
  });
  Object.defineProperty(sel, 'innerHTML', { get() { return ''; }, set() { sel.options.length = 0; } });

  const state = { currentUser: null, setImpl: null, sets: [], snapshots: [], profileUpdates: [], authListeners: [] };
  const alerts = [];
  const confirms = { answer: true, asked: [] };

  const docRef = (col, id) => ({
    onSnapshot(cb) { state.snapshots.push({ col, id, cb }); return () => {}; },
    get() { return state.getImpl ? state.getImpl(col, id) : Promise.resolve({ exists: false, data: () => ({}) }); },
    set(data, o) {
      state.sets.push({ col, id, data: JSON.parse(JSON.stringify(data)), opts: o });
      return state.setImpl ? state.setImpl(col, id, data) : Promise.resolve();
    },
  });
  const db = { collection: (col) => ({ doc: (id) => docRef(col, id) }) };
  const authObj = {
    get currentUser() { return state.currentUser; },
    onAuthStateChanged(fn) { state.authListeners.push(fn); },
    signOut() { return Promise.resolve(); },
  };
  const firebase = { apps: [1], initializeApp() {}, firestore: () => db, auth: () => authObj };

  class FileReaderStub {
    readAsText(file) { Promise.resolve().then(() => this.onload && this.onload({ target: { result: file.__content } })); }
  }

  doc.getElementById('tableContainer').style.display = 'none'; // כמו ב-HTML המקורי
  const ctx = {
    console: { log() {}, error() {}, warn() {} },
    document: doc, firebase,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    FileReader: FileReaderStub, Blob, URL,
    fetch: opts.fetch || (async () => ({ json: async () => ({ version: 'V0' }) })),
    saveAs() {},
    location: { pathname: '/', href: '' },
    sessionStorage: (() => {
      const store = {};
      return {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
      };
    })(),
  };
  ctx.window = ctx;
  const winListeners = {};
  ctx.addEventListener = (t, fn) => { (winListeners[t] = winListeners[t] || []).push(fn); };
  vm.createContext(ctx);

  const run = (file) => vm.runInContext(fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  run('holidays_db.js');
  files.forEach(run);

  // מאפשר לקרוא ערכי const/let ברמת הקובץ (שלא הופכים לתכונות על window), לצורך בדיקות בלבד.
  ctx.__evalInContext = (expr) => vm.runInContext(expr, ctx);

  // החלפת דיאלוגים בספיי (הפונקציות נקראות לפי שם גלובלי, לכן ההחלפה משפיעה על כל הקוד)
  ctx.customAlert = (msg) => { alerts.push(String(msg)); return Promise.resolve(true); };
  ctx.customConfirm = (msg) => { confirms.asked.push(String(msg)); return Promise.resolve(confirms.answer); };
  ctx.customPrompt = () => Promise.resolve(null);

  return { ctx, doc, state, alerts, confirms, winListeners, ROOT };
}

// הכנת חודש: שם עובד, תעריפים, בחירת חודש, ביטול חלון "משמרות נגררות", ובניית הטבלה עם generateTable האמיתי
function setupMonth(app, { year, month, rate = 50, eshel = 52.66, name = 'בודק', carry = 0, openBalances } = {}) {
  const { ctx, doc } = app;
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const key = year + '-' + String(month).padStart(2, '0');
  const sel = doc.getElementById('monthYearSelect');
  sel.options.length = 0;
  sel.options.push({ value: key, text: MONTHS[month - 1] + ' ' + year });
  sel.value = key;
  doc.getElementById('employeeName').value = name;
  doc.getElementById('hourlyRate').value = String(rate);
  doc.getElementById('eshelRate').value = String(eshel);
  ctx.carryOverData[key] = carry;
  ctx.monthlyBalances[key] = openBalances || { reg: 0, shab: 0, sick: 0, dec: 0, cho: 0 };
  ctx.generateTable();
  return key;
}

const COLS = ['I', 'I2', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];

function row(app, day) { return app.doc.getElementById('tbody').children[day - 1]; }
function cellVal(app, id) {
  const el = app.doc.getElementById(id);
  return el ? Number(Number(el.getAttribute('data-val') || 0).toFixed(6)) : null;
}
function readDay(app, day) {
  const g = (id) => app.doc.getElementById(id);
  const out = {
    total: cellVal(app, 'val-total-hours-' + day),
    shab: cellVal(app, 'val-shabbat-hours-' + day),
  };
  COLS.forEach((c) => { out[c] = cellVal(app, 'val-' + c + '-' + day); });
  const cost = g('val-cost-' + day);
  out.cost = Number(Number(cost.getAttribute('data-cost') || 0).toFixed(6));
  out.gross = Number(cost.getAttribute('data-gross') || 0);
  out.isShift = cost.getAttribute('data-is-shift');
  out.desc = (g('val-desc-' + day).innerText || '').replace(/\s+/g, ' ').trim();
  out.shiftInput = row(app, day).querySelector('.shift-type-input').value;
  return out;
}
function setShiftCode(app, day, code) {
  const inp = row(app, day).querySelector('.shift-type-input');
  inp.value = code;
  app.ctx.handleShiftType(inp);
}
function setTimes(app, day, start, end) {
  const [a, b] = row(app, day).querySelectorAll('.time-input');
  a.value = start; b.value = end;
  app.ctx.formatTimeInput(a);
  app.ctx.formatTimeInput(b);
}
function clearDay(app, day) { setShiftCode(app, day, ''); }

module.exports = { loadApp, setupMonth, readDay, setShiftCode, setTimes, clearDay, row, COLS, ROOT, SPLIT_FILES, ORIGINAL_FILE };
