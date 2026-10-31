<!-- COT System Version: V202610310155 -->

# COT - Calculate Over Time: full source + tests + deployment guide

Current version: **V202610310155** (see `version.json`)

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
