'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('bump-version מעדכן version.json וכל חותמות הגרסה בכל הקבצים (כולל content/)', () => {
  const root = path.join(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cot-bump-'));
  fs.mkdirSync(path.join(tmp, 'content'));
  const files = ['version.json', 'index.html', 'style.css', 'holidays_db.js', 'components.js', 'content-loader.js',
    '00-core.js', '01-shift-codes.js', 'calculator.js', '02-ui-dialogs.js', '03-auth.js', '05-session-data.js',
    '06-excel-export.js', '07-version-manager.js', '08-pdf-export.js', '09-payroll-import.js', 'DEPLOY.md', 'README.md',
    path.join('content', 'shift-info.he.html'), path.join('content', 'mini-shift-info.he.html'), path.join('content', 'system-updates.he.html')];
  for (const f of files) fs.copyFileSync(path.join(root, f), path.join(tmp, f));

  execFileSync('node', [path.join(root, 'scripts', 'bump-version.js'), 'V209901011200', '--root', tmp]);

  assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'version.json'), 'utf8')).version, 'V209901011200');
  for (const f of files) {
    if (f === 'version.json') continue;
    const s = fs.readFileSync(path.join(tmp, f), 'utf8');
    assert.match(s, /COT System Version: V209901011200/, f);
    assert.ok(!/COT System Version: V2026/.test(s), f + ' נשארה גרסה ישנה');
  }
  assert.throws(() => execFileSync('node', [path.join(root, 'scripts', 'bump-version.js'), 'bad', '--root', tmp], { stdio: 'pipe' }));
});

test('bump-version.js מוסיף ?v=VERSION לכל src/href מקומי ב-index.html (לא לקישורי CDN חיצוניים), כדי שרענון גרסה יביא קבצים טריים', () => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cot-bump-'));
  const root = path.join(__dirname, '..');
  execSync(`cp -r ${root}/* ${tmp}/`, { stdio: 'ignore' });

  execSync(`node ${tmp}/scripts/bump-version.js V202601010101 --root ${tmp}`, { stdio: 'ignore' });
  let html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  assert.match(html, /src="calculator\.js\?v=V202601010101"/);
  assert.match(html, /href="style\.css\?v=V202601010101"/);
  assert.match(html, /src="https:\/\/cdnjs\.cloudflare\.com[^"]*"/, 'קישורי CDN חיצוניים לא אמורים לקבל ?v= בכלל');
  assert.ok(!html.includes('cdnjs.cloudflare.com') || !/cdnjs\.cloudflare\.com[^"]*\?v=V202601010101/.test(html));

  // הרצה חוזרת (בגרסה אחרת) מחליפה את ה-?v= הקודם, לא מכפילה אותו
  execSync(`node ${tmp}/scripts/bump-version.js V202601010102 --root ${tmp}`, { stdio: 'ignore' });
  html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  assert.match(html, /src="calculator\.js\?v=V202601010102"/);
  assert.ok(!html.includes('V202601010101'), 'הגרסה הקודמת לא אמורה להישאר בתג ה-script');
  assert.ok(!html.includes('?v=V202601010102?v='), 'אין להכפיל את ה-query string');

  fs.rmSync(tmp, { recursive: true, force: true });
});
