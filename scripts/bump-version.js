'use strict';
// מעדכן גרסה במקום אחד ובכל חותמות הקבצים.
// שימוש:  node scripts/bump-version.js [Vyyyymmddhhmm] [--root <תיקייה>]
// ללא תאריך - נוצרת גרסה אוטומטית מהשעה הנוכחית (לפי שעון המחשב).
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let root = path.resolve(__dirname, '..');
const ri = args.indexOf('--root');
if (ri >= 0) { root = path.resolve(args[ri + 1]); args.splice(ri, 2); }

const p = (n) => String(n).padStart(2, '0');
const now = new Date();
const auto = 'V' + now.getFullYear() + p(now.getMonth() + 1) + p(now.getDate()) + p(now.getHours()) + p(now.getMinutes());
const version = args[0] || auto;
if (!/^V\d{12}$/.test(version)) { console.error('פורמט גרסה לא תקין (צפוי Vyyyymmddhhmm, לדוגמה V202610301530):', version); process.exit(1); }

// כל קובצי המקור שיש להם חותמת "COT System Version" בתחילת הקובץ (JS ו-HTML כאחד).
// version.json הוא היחיד שלא מקבל את ההערה הזו - הוא עצמו מכיל רק את מספר הגרסה.
const STAMPED_FILES = [
  'index.html', 'style.css', 'holidays_db.js', 'components.js', 'content-loader.js',
  '00-core.js', '01-shift-codes.js', 'calculator.js', '02-ui-dialogs.js', '03-auth.js',
  '05-session-data.js', '06-excel-export.js', '07-version-manager.js',
  path.join('content', 'shift-info.he.html'), path.join('content', 'mini-shift-info.he.html'),
];

const changed = [];
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ version }, null, 4) + '\n');
changed.push('version.json');

for (const f of STAMPED_FILES) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) { console.warn('דילוג (לא נמצא):', f); continue; }
  const src = fs.readFileSync(fp, 'utf8');
  const out = src.replace(/COT System Version: V\d{12}/g, 'COT System Version: ' + version);
  if (!/COT System Version: V\d{12}/.test(src)) { console.warn('אזהרה: לא נמצאה חותמת גרסה קיימת ב-' + f + ' - לא עודכן'); continue; }
  if (out !== src) { fs.writeFileSync(fp, out); changed.push(f); }
}
console.log('גרסה חדשה:', version);
console.log('עודכנו (' + changed.length + '):', changed.join(', '));
