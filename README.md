<!-- COT System Version: V202610312326 -->

# COT - Calculate Over Time: full source + tests + deployment guide

Current version: **V202610312326** (see `version.json`)

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
