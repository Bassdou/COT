<!-- COT System Version: V202611021012 -->

# COT - Calculate Over Time: full source + tests + deployment guide

Current version: **V202611021012** (see `version.json`)

## File layout

```
index.html, style.css, holidays_db.js      - static, never obfuscated
components.js, content-loader.js            - popup shells + external content loader
content/shift-info.he.html                  - "Important info / user guide" popup content
content/mini-shift-info.he.html             - "Quick shift codes" popup content
00-core.js                                   - global settings + Firebase connection
01-shift-codes.js                            - shift and absence codes (single source, no duplication)
calculator.js                                - *** the calc engine - the ONLY file to obfuscate ***
02-ui-dialogs.js                             - dialogs, keyboard navigation, info popups
03-auth.js                                   - register / login / test-bypass mode / screen lock
05-session-data.js                           - cloud/file save-load, month close, sheet reset
06-excel-export.js                           - Excel export
07-version-manager.js                        - checks version.json and the cloud for updates
version.json                                 - current version number only
DEPLOY.md                                    - step-by-step production deployment procedure
scripts/bump-version.js                      - stamps a new version into every file at once
reference/calculator.original.js             - the original single-file source, pre-split (for comparison only)
tests/                                        - automated tests (`node --test`, no npm install needed)
manual-template/                             - user-manual skeleton + screenshot checklist (see below)
```

**The file numbering (00, 01, 02...) is only to keep them sorted in the folder - it has no bearing
on the real load order, which is set by the `<script>` tag order in `index.html`. If you ever copy
files elsewhere, preserve the order already shown there.**

## How to deploy (no npm, no terminal)

See **`DEPLOY.md`** for the full click-by-click procedure (which files to upload, how to obfuscate
`calculator.js`, the GitHub Pages upload steps, a 9-point smoke test, and rollback). Short version:

1. Open `calculator.js` (only that file), copy all of it, and paste it into obfuscator.io.
2. Copy the obfuscated output and save it back under the **same name** - `calculator.js`.
3. Upload the obfuscated `calculator.js` to GitHub, **alongside** every other file as-is (not
   obfuscated): `index.html, style.css, holidays_db.js, components.js, content-loader.js,
   content/, 00-core.js, 01-shift-codes.js, 02-ui-dialogs.js, 03-auth.js, 05-session-data.js,
   06-excel-export.js, 07-version-manager.js, version.json, COT_LOGO.jpg, cot_user_manual.pdf`.
4. Keep (never upload) the un-obfuscated `calculator.js` from this zip somewhere safe - that's
   always the source for the next update. **Never re-obfuscate an already-obfuscated file.**

Obfuscation tools sometimes strip the "COT System Version" comment at the top of the file. That's
fine and changes nothing: `version.json` is always the source of truth for the version shown on
screen, not the comment.

**When do you need to re-obfuscate?** Only when `calculator.js` itself changes (a calculation
formula changed). A change to any other file (e.g. text in `content/`, or an interface fix) needs
no obfuscation at all - it's uploaded as-is.

## Updating "Important info" content without a new version

The content of both popups ("Important info / user guide" and "Quick shift codes") lives in plain
HTML files under `content/`. Open either in any text editor, edit, save, and upload to GitHub -
that's it. No need to touch the version or any JS file.

## Bumping the version across every file at once

```
node scripts/bump-version.js V202611011430
```
(Format: `V` + year(4) + month(2) + day(2) + hour(2) + minute(2); with no argument, an automatic
version is generated from the current time.) The command updates `version.json` and the "COT
System Version" line at the top of every file. **Run it before you obfuscate** `calculator.js`, so
the comment at its top (if it survives obfuscation) shows the right version.

If you'd rather not run commands yourself, just tell me what changed and I'll prepare a fresh zip
with every stamp already updated, exactly like this one.

## Running the tests

Requirement: Node.js 20+. **No `npm install` needed** - the tests have zero external dependencies.

```
node --test
```
About 12-15 seconds. Expected result: `pass 47, fail 0, todo 2` (the two todos are deliberate
reminders - next year's holidays, and legal PDFs not yet supplied - not failures).

## How the tests prove the calculations never changed

- `reference/calculator.original.js` - the original file, before any change.
- `tests/golden/*.json` - 5,520 day-shift scenarios and 4 full month summaries, **computed from
  the original file**.
- `tests/calc.golden.test.js` runs the current split code on those same scenarios and compares
  result-by-result.
- `tests/unchanged-calc-code.test.js` confirms the constants pulled out into `01-shift-codes.js`
  (`SHIFT_CODES`, `ABSENCE_CODES`, `WEEKEND_BLOCKED_ABSENCE_CODES`) and `columnsData` are byte-for-byte
  identical to what was embedded in the original file - so the split changed no coefficient, shift
  code, or value.

**For a deliberate future formula change:** run `node scripts/bump-version.js` first, then
`node tests/generate-golden.js` to produce a new golden set (only then does it replace the one in
this zip). That way a formula change is always visible in the tests and tied to a version.

## Next year's holidays

No action is needed until the dates are published (usually at the end of the preceding year).
Until then, a day with no entry in `holidays_db.js` is simply treated as a normal weekday,
matching the code's existing behavior. An automated check (`tests/holidays.test.js`) starts
flagging this from December 15 of each year.

## User-manual skeleton (`manual-template/`)

- `cot-manual.html` - the manual, with corrected text (matching the code's real behavior, not the
  old booklet) and marked placeholders for every screenshot. You can already open it in a browser -
  every missing image shows a box with the exact filename needed.
- `screenshots-checklist.md` - an exact list of the 16 required screenshots, with a filename for each.
- `images/` - empty folder; screenshots go here, under the names from the list.

**Next steps:** take the screenshots per the list and send them to me (skipping any that are hard
to get is fine). I'll build the final polished manual from them and export it as a separate zip
named `MANUAL`, versioned to match the app version at that moment.

## This round: 4 payroll-import refinements + a misleading summary cell removed + "הורד PDF" rebuilt

**Payroll-import refinements:** moved the import button out of the top bar and back into the
action-grid (between "טען גליון" and "שמור גליון"), shortened its label to "יבא דו"ח פיצול". Fixed
the comparison table's time cells to align right (not center) while keeping `dir="ltr"` for correct
entrance-then-exit order. The admin-only discrepancy analysis no longer renders after an import at
all (the detection function itself stays in the file, unused for now, likely for the still-unspec'd
"בירור דוח פיצול"). The "בקשת עדכון" PDF is now compact and marks two things: a day whose hours
differ from what was last scanned this session (amber), and absence days (light purple, matching the
color the main table already uses for absences) - gracefully does neither if nothing was scanned.

**Removed a genuinely misleading cell:** the main table's summary row had a cell, under the "ערך"
column, that summed all 16 hour-category columns together - since those columns are overlapping
breakdowns of the same worked hours (not independent additive quantities), that sum double/triple-
counted and never represented anything real. It's gone now, not just hidden; one golden test fixture
that had captured the old number was deliberately regenerated.

**"הורד PDF" rebuilt to resemble the real payroll report's structure.** It no longer screenshots
COT's own colored table - it builds a dedicated black-and-white, dense template (same approach as
the "בקשת עדכון" PDF) with a "שם עובד / לתקופה: MM/YYYY / תאריך הפקה" header and all 16 hour columns
in the same order COT already computes them, plus a two-line summary footer reading the existing
table-footer totals - matching the real report's own layout conventions. This replaces the previous
version outright, not a second option alongside it.

## Two lock-screen fixes

**Bug 1 - the inactivity alert could show even at the login screen, where nothing needs locking.**
`initIdleTimer()` now explicitly checks whether the app is already at the login screen before doing
anything else - if there's no logged-in user and no bypass session active, it just resets the idle
counter and returns immediately, never reaching the alert/lock logic at all.

**Bug 2 (his wording called both of these "bugs"; this one reads more like a gap than a defect, so
flagging the interpretation rather than guessing silently) - added a manual lock control.** Until
now the only way to lock the screen was the automatic 15-minute idle timer; there was no way to lock
it on demand (e.g. right before stepping away). A new button next to "התנתק" in the top bar
(`lockScreenNow()`) triggers the exact same lock flow the idle timer already used - factored both
into one shared function so there's a single implementation, not two that could drift apart.

## This round: rebuilt the payroll-import parser around the real report format

The PDF used to validate the original payroll-import approach turned out not to be representative
- a real payroll-department "דוח פיצול" (`דוח_פיצול_202609.PDF`) has correct, properly-encoded Hebrew
text, not the broken jsPDF font issue the first sample had. Its only quirk is RTL display order:
each extracted line has its word order reversed, and each Hebrew word's own characters reversed
(numbers and times are unaffected, since they're always left-to-right). Validated the fix in Python
against the complete real file before porting it - reversing token order, then reversing only the
non-numeric tokens' characters, reconstructs every line perfectly, including the report's own
"לתקופה: 2026 / 09" header and its "סה"כ שעות לפני הקיזוז" summary row.

`09-payroll-import.js` was rewritten entirely around this (replacing the old position-based
approach, not running both): `extractPayrollPdf()` now also returns the report's period and its
stated total; `checkPayrollPeriodMatch()` warns (non-blocking) if the report's month doesn't match
whatever month is currently open in COT; `verifyExtractionTotal()` sums the extracted total-hours
and compares it against the report's own declared total, catching a dropped/misread row before it
reaches anything else. The admin-only formula-discrepancy check keeps its earlier sequence-alignment
logic, now fed by the cleaner extraction. Employee-identity extraction (name/ID number, also present
in the real report) was discussed and intentionally left out for now.

A separate feature for analyzing *other* employees' reports ("בירור דוח פיצול") was discussed and
deliberately shipped separately rather than held for - it's a different audience and purpose, with
no spec yet, and there's real value in finding out now whether PDF.js behaves as expected in an
actual browser (it's never been run in one), rather than after more features get built on top of it.

## This round: payroll-report import (time-saving) + an admin-only formula-accuracy check

**New: "ייבוא דוח שכר להשוואה".** The payroll department's "דוח פיצול" PDFs turn out to be generated
by jsPDF 2.5.1 too - the exact library (and exact missing-Hebrew-font bug) COT's own PDF export used
before it was replaced. A new `09-payroll-import.js`, using PDF.js 3.4.120 entirely client-side (the
file never leaves the browser), extracts each day's start/end times by reading the PDF's text items
and their positions - no OCR, no reading the (broken) Hebrew labels at all. After scanning: an exact-
wording confirmation message, then a review table where the extracted times are editable (to fix a
scan misread before anything is applied), and one "עדכן שעות" button that writes every reviewed time
into the real table and recalculates. The goal is purely saving retyping - COT's own calculated
columns (totals, premiums, etc.) are completely unaffected by any of this until that button is
pressed, same as typing the hours by hand would be.

**New, visible only to the account owner: a formula-accuracy check.** Gated by the same admin email
already used for the cloud-version auto-updater (`bassam@bsbc.co.il` - duplicated locally in this
file since each `<script>` tag gets its own top-level `const` scope). Investigating the real PDF
further surfaced two real quirks of the source report: it omits every zero-value column entirely,
and a value (often total hours) sometimes lands glued directly onto the end of the description text
with no separating space. Rather than fragile pixel-position column mapping, the comparison aligns
the PDF's non-zero values, in sequence, against COT's own non-zero columns in COT's own fixed order
- validated against a real day in the uploaded file, where every non-zero value matched exactly.
Cost/value is deliberately excluded (depends on the hourly rate entered, not the formula). This
analysis only compares; it's informational and never writes anything.

A separate, not-yet-built feature called "בירור דוח פיצול" was discussed for analyzing *other*
employees' reports - intentionally kept out of COT entirely, pending a fuller spec.

## This round: 2 real bug fixes + registration/consent compliance + 3 system-updates workflow tools

Several rounds happened under the same version number (V202611010647) while deliberately not
bumping the version per instruction - this entry covers everything since that number was first
shipped, now finally bumped into a new version.

**Bug fix - carried-over shifts corrupted by file load.** `handleFileLoad`'s conflict-resolution
logic predated the `{total, presence}` split and did `parseInt()` directly on what could now be an
object, silently corrupting it to `NaN`/a bare number and overwriting the correct value even when
there was no real conflict - explaining both "comes up in the old approach after a file load" and
"all carried-over shifts count as presence" in one root cause. Rewrote it to extract `.total` via a
safe helper for comparison, preserve the real entry when there's no conflict, and correctly restore
the cloud's original entry (not a corrupted derivative) when there is one - offering the real
two-field correction modal instead of the old single-number prompt. 3 new tests.

**Bug fix - "deep refresh" didn't actually refresh everything.** `applyUpdate()` cache-busted
`index.html` itself via a `?v=` query, but the `<script src>`/`<link>` tags it loads had no
cache-busting at all - the browser could keep serving `calculator.js`, `style.css`, etc. from its
own cache even after a "fresh" reload. `scripts/bump-version.js` now automatically appends/updates
`?v=VERSION` on every local script/stylesheet tag in `index.html` (never touches external CDN URLs),
idempotently. New regression test runs the real script against a scratch copy of the repo.

**New: mandatory terms/privacy/accessibility consent.** Registration now has a required checkbox
("קראתי ואני מסכים/ה ל...") linking to the real `terms.pdf`/`privacy.pdf`/`accessibility.pdf` - the
form is blocked (no Firebase account created) until it's checked. Existing users who registered
before this existed are gated too: a new `termsGateScreen` blocks entry immediately (no grace
period, unlike the password-strength rule) on their next login/refresh until they accept, tracked
via `termsAccepted`/`termsAcceptedAt` in Firestore the same way for both paths. 6 new tests across
both flows.

**New: "סה"כ היעדרות" moved to the carry-over fix; three small tools for the system-updates feed.**
`tools/system-update-composer.html` - a form that generates a ready-to-paste `<article>` block, so
adding an update never requires hand-editing HTML/dates. 3 new automated tests on
`content/system-updates.he.html` catch bad content before it ships: no two pinned items active at
once, expiry never before the posting date, and balanced `<article>` tags. `whats-new.html` - a
standalone page showing every update ever published (ignoring expiry), linked via a small
"היסטוריה מלאה" link next to "עדכוני מערכת" on the login screen.

**Also in this round:** the in-app guide's "הורד ספרון הדרכה" link moved from the bottom to a
prominent banner at the top of the "מדריך למשתמש" popup.

## Finally done: "מידע חשוב" → "מדריך למשתמש" (agreed a while back, flagged as not actually done)

Renamed the button and modal title. While in there, also refreshed `content/shift-info.he.html`
itself - it still used the pre-redesign color palette throughout, and had gone factually stale in
two real ways: it described the balance cards as "כרטיסיות" (cards) when they're a single table
now, and it placed the summary row "בתחתית המסך" (at the bottom of the screen) when it's been at
the top for several versions. Added coverage for features that didn't exist when this was last
written: the 4-presence-cap rule, the carry-over correction button, the simple/full view toggle,
and direct PDF export. The full illustrated manual (`cot_user_manual.pdf`, with real screenshots)
is still intentionally not merged in here - that's still waiting on him to take the photos, per the
earlier decision - this only touched the in-app text popup.

## Redesign: the top KPI ribbon's shift/absence/carry-over wording and layout

He said the "carried-over shifts" control was unreadable and unclear, and that it's important data
for planning next month's first week. It had been a tiny 11px sub-caption squeezed under "סה"כ
משמרות", with increasingly long text ("כולל X נגררות (Y נוכחות, לתיקון)") that never fit its role.
Rebuilt it as a real, properly-sized `<button>` of its own in the ribbon ("נגררות מחודש קודם: X (Y
נוכחות)") with a pencil icon and real button styling (border, hover state) - no longer a disguised
link. Also relabeled "סה"כ משמרות"/"סה"כ היעדרות" to the shorter "נוכחות"/"היעדרות" and gave each a
distinct color (blue for presence, purple for absence) so the two are easy to tell apart at a
glance. Removed the now-unused `.dash-sub`/`.dash-sub-link` CSS this replaced.

## Fix: carried-over shifts now track presence and absence separately

He pointed out a real gap in the 4-presence-cap rule: `carryOverData` stored a single combined
number (total shifts in the previous month's tail week), and the new rule treated that whole
number as if it were all presence - so a carried-over week that was actually, say, 3 presence + 2
absence would wrongly count as 5 presence, over-blocking the next month. `closeMonth()` already
computed this tail count automatically (it wasn't a manual-only value, contrary to what Claude
first (incorrectly) said) - the fix was to have it split the count into `{total, presence}` instead
of one number, and read `.presence` specifically wherever the 4-cap rule needs it, while `.total`
still feeds the existing 5-per-week warning. A shared `getCarryOverCounts(key)` helper handles both
the new object format and the old bare-number format (treating an old number as all-presence, i.e.
unchanged from previous behavior) so existing saved data in Firestore keeps working without a
migration. The manual correction modal (`openCarryModal`) now asks for both numbers, with the
presence field capped to the total field's value. The "כולל X נגררות" caption now shows the
breakdown too.

## New: "סה"כ היעדרות" alongside "סה"כ משמרות"

He asked how to see the presence/absence split for the month - "סה"כ משמרות" only ever counted
presence shifts, with no indication it excluded absences, and there was no single combined count of
absence days anywhere (only broken out per absence type in the balances table). Added a new KPI
item, "סה"כ היעדרות", counted with the exact same definition the new weekly 4-presence-cap rule
uses (any day that counts toward the weekly quota but isn't presence) - so the two numbers on
screen now match what the cap is actually checking against.

## Bug fix: the carried-over-shifts correction link was invisible when the count was 0

He asked how to correct the carried-over shift count - the click-to-reopen link (added a few
versions back, under "סה"כ משמרות") only ever showed text when the count was above zero; at 0 its
own text was empty, so there was literally nothing visible to click even though the link itself
still worked. Now it always shows ("כולל 0 נגררות (לתיקון)" etc.), regardless of the value.

## Bug fix: the PDF export produced completely garbled Hebrew

He tested the "הורד PDF" button and sent back the resulting file - the Hebrew text was fully
unreadable gibberish, confirmed by extracting its text layer. Root cause: jsPDF's built-in fonts
(helvetica/times/courier) are Latin-only with no Hebrew glyphs at all, and jsPDF has no built-in
RTL/bidi text shaping - the first implementation (jsPDF-AutoTable, drawing vector text directly)
could never have produced correct Hebrew. Fixed by switching the approach entirely: `html2canvas`
now captures the table exactly as the browser already renders it correctly on screen (the browser
does the Hebrew/RTL text shaping, not jsPDF), and that image gets embedded in the PDF page. The
trade-off is conscious, not accidental: the resulting PDF has no selectable/searchable text, since
it's an image. The export always captures all 25 columns regardless of the simple/full view
toggle's current state (same principle as printing), and temporarily disables `position: sticky`
during the capture to avoid the header/date-column duplicating in the screenshot. Rewrote the test
suite for this file accordingly (it can't verify the screenshot's visual content without a real
browser, but does verify the view-toggle state is always restored correctly, including after an
error, via a mocked `html2canvas`/`jsPDF`).

## Bug fix: maintenance screen was always visible, regardless of the Firestore flag

The maintenance-overlay redesign a few versions back added `.maintenance-overlay { display: flex
!important; ... }` to center it - but `!important` in a stylesheet rule always beats a plain inline
style, and the JS that shows/hides this screen (`maintenanceMode === true` from `system/settings` in
Firestore) sets `element.style.display = 'none'`/`'flex'` as a plain inline style. So the CSS
silently overrode the JS and kept the screen visible no matter what the flag said. Fixed by dropping
`display` from that rule entirely (keeping only the centering properties) - display stays purely
JS-controlled, same as before the redesign. This class of bug (CSS fighting JS-controlled inline
styles) can't be caught by the Node test suite at all, since it has no real CSS cascade - added a
static-source regression test instead that specifically checks `.maintenance-overlay` never declares
`display` in style.css.

## All 13 backlog items now complete

Items 2, 3, 4, 5, and 7 - the remaining five from the list below - are now also done:

- **Item 2** - `applyUpdate()` now saves a draft of the open sheet (name, rates, month, every typed
  shift) to `sessionStorage` right before the forced refresh, only when something unsaved exists
  (`window.__cotDirty`). After the reload, it's restored silently and automatically, then cleared
  (one-time use) - the person sees their work still there, with a note to click "שמור גליון".
- **Item 3** - before the main cloud write in `saveData()`, the app now re-reads the Firestore doc
  and compares `monthlyBalances`/`carryOver` to what was loaded when the page opened. If someone
  else (another tab/device) saved something different since then, it asks before overwriting.
  Silent/background saves (e.g. on logout) skip this check so they're never blocked unexpectedly.
- **Item 4** - a persistent toggle above the table switches between full (25 columns) and simple
  (the 11 non-percentage columns only) view. CSS-only (`display:none` on the 14 percentage
  columns, both header and body, via attribute selectors on their existing ids) - calculator.js
  still computes every column exactly as before. Printing always shows all 25 columns regardless
  of the toggle. Defaults to simple on phones (<700px), full on desktop, each time the sheet opens.
- **Item 5** - a new "הורד PDF" button next to the Excel one; not dependent on the browser's print
  dialog/printer settings. (The first version used jsPDF-AutoTable to draw a real vector table, but
  that produced garbled Hebrew - see the bug-fix note above for why, and what replaced it.) Same
  filename convention as the Excel export.
- **Item 7** - new rule: of the 5 presence+absence entries already allowed per calendar week, at
  most 4 may be presence (any entry with a start+end time, whether from a shift code or typed
  directly) - at least one must be an absence code. Enforced the same way as the existing
  weekend-absence block: the offending entry is cleared immediately with an alert. מילואים on a
  weekday counts as the absence, not as presence; on Fri/Sat it's excluded entirely, matching its
  existing behavior. Carried-over shifts count toward the cap too. This change updated one of the
  four golden month-summary fixtures (`oct-2026-mixed`), which had a week with 5 presence days and
  no absence - exactly the case the new rule is meant to catch; the golden baseline was
  deliberately regenerated to reflect it, the same way the erev-chag fix was handled.

## This round: 6 of the 11 backlog items (full accounting below)

Done and shipped in this version:
- **Item 1** - Enter now submits the "carried-over shifts" modal; the "כולל X נגררות" caption is
  now a clickable link that reopens the same modal, pre-filled, for a correction later.
- **Item 6** - customDialog (every alert/confirm popup) redesigned to the current palette, with a
  type-based icon (green check / red X / amber question-mark / blue info) and a personalized title
  ("לתשומת לבך, [שם עובד]", falling back to "לתשומת לבך" with no name).
- **Item 9** - "הודעות מערכת" renamed to "עדכוני מערכת" and moved out of index.html into
  `content/system-updates.he.html` - editable without a new version, like the other content files.
  Each entry carries a posting date and an expiry date and is filtered/sorted client-side
  (pinned first, then newest-first); the old 3 messages were reviewed and one (the understated
  original "UI redesign" note) was rewritten to actually reflect the real scope of the redesign,
  and a new entry for the erev-chag payroll fix was added. Claude will keep maintaining this file
  going forward as a standing part of every version.
- **Item 10** - maintenance overlay (done last round, included again here).
- **Item 11** - the "update available" toast redesigned to the current palette/icon.
- **Item 12** - the "מידע חשוב" and "קודי משמרות" modal headers redesigned (icon + current palette;
  wording unchanged).

**Not included in this version** (still only specified, not coded): item 2 (save a draft before a
forced version refresh), item 3 (warn before an overwriting save), item 4 (simple/full table
toggle), item 5 (direct PDF export), item 7 (4-presence-shifts-per-week cap - the remaining
calculation-engine change). These are substantial pieces of work each; flagged honestly rather than
rushed.

## Payroll-accuracy fix: erev-chag overtime threshold (validated against real payroll figures)

On a non-Friday, non-night erev-chag/cholhamoed day shift, the app used to set the 100%→125%
overtime threshold equal to that day's *shortened* standard hours (e.g. 4.5h on ערב יום כיפור) -
so the first hour past the shortened standard jumped straight to 125%, with no 100% bracket at
all. Validated against two real payroll-department figures (20/9/2026 ערב יום כיפור and 11/9/2026
ערב ראש השנה, the latter on a Friday and already correct via a separate formula) that the
100%→125%/125%→150% thresholds should stay at the normal full-day 8h/10h mark - the shortened
standard hours only decide how much of the early hours count as תקן (column I) vs 100% (column J),
not where the overtime brackets begin. Both examples match exactly post-fix. Friday erev-chag,
night-shift erev-chag, and every non-erev-chag day are untouched (no validated data existed for
those, so the fix was scoped narrowly on purpose). 3 new regression tests lock this in, and the
golden snapshot was deliberately regenerated to reflect the corrected values as the new baseline.

## Top-panel polish (second round)

- The 5 top summary cubes (shifts/standard/gross/eshel/overtime value) became one ribbon, matching
  the cloud-balances ribbon's style, instead of a card grid.
- Fixed a bug this introduced: the show/hide toggle in `calculator.js` was still forcing
  `display:grid` on the ribbon via inline style, which would have silently overridden the new CSS
  and broken the layout - caught by a new regression test before it shipped.
- Table title made clearly bigger than the color legend below it (was smaller, which read oddly).
- The on-screen balances table's rows were tightened (less vertical padding).

## Top-panel polish (first round)

- Version badge moved under the logo, no background (just muted text).
- Logout (white background) and Info (amber background) buttons both made more prominent.
- Cloud-balances ribbon given a bit more visual weight (deeper blue tint, soft shadow, border), plus
  an emoji per item and a shorter label ("יתרות לאחר סגירה:").
- Header-panel (employee/month/rates + load/save/generate/reset) spacing tightened.
- KPI cards (shifts/standard/gross/eshel/overtime value) made shorter, less padded.
- Table title and color legend compressed and made sticky during vertical table scroll, staying
  locked above the table's own sticky header.
- Table header background lightened from near-black to the brand blue, on the main timesheet and
  the two smaller tables (balances, shift-info popup).
- Veteran users with an old weak password now get a proactive banner (with the 15.11.2026 deadline
  date and a voluntary, cancellable password-update link) instead of silently finding out on the
  deadline itself.

The bottom balance cards (7 separate cubes) were replaced with a single table, matching the
existing print-only `balances-table`'s columns and styling (`סוג היעדרות / יתרת פתיחה / ניצול החודש /
יתרה חדשה`). As a bonus, the closing balance for הצהרה and בחירה - already computed by
`calculator.js`, previously shown only when printing - is now also shown on screen
(`bal_close_dec` / `bal_close_cho`, new ids; zero calculation logic changed). Every existing id
and the lock-button/input adjacency `toggleLock` depends on were preserved exactly.

## New design (first approved as a mockup in the Design canvas, now implemented in the real app)

The app went through a full visual redesign - navy + amber palette, Heebo font, a split login
screen (brand panel + form), and dashboard cards with icon badges. **No id, onclick, or DOM
structure the JS depends on was changed** - only `style.css` and the markup in `index.html`. Before
and after the change, every `id` the JS reads (across all 8 files) was compared automatically
against what actually exists in `index.html` - including critical "next sibling" relationships
(like the lock button that must sit immediately after its balance field). Nothing was missing.

Emoji were intentionally left in two places: the show/hide-password buttons and the balance lock
buttons, because the JS writes the emoji into them directly at runtime - changing those would mean
editing logic, not just styling.

## What's not done (and why)

- **Actual obfuscation** - happens on your end at obfuscator.io, not here (see above).
- **Next year's holidays** - dates and standard hours must come from the official circular when
  published; not something to invent.
- **Enforcing the 15.11.2026 deadline and Firestore rules server-side, the admin email as a custom
  claim** - requires changes in the Firebase console, not in the client-side code.
- **The final manual with real screenshots** - waiting on your screenshots.
- **Full emoji-to-SVG icon system, and a fully unified font-size scale** - deferred; both need real
  visual QA in an actual browser, which this sandbox can't do.
