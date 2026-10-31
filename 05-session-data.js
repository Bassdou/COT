/* COT System Version: V202610312326 */
// קובץ: 05-session-data.js
// שמירה/טעינה מהענן ומקובץ, סגירת חודש, איפוס גליון (clearData), ופאנל היתרות העליון.

window.getActiveMonthKey = function() {
    let keys = Object.keys(window.monthlyBalances).filter(k => k.match(/^\d{4}-\d{2}$/)).sort();
    if (keys.length === 0) return null;
    return keys[keys.length - 1];
};

function updateCloudBalancesPanel() {
    let keys = Object.keys(window.monthlyBalances).filter(k => k.match(/^\d{4}-\d{2}$/));
    if (keys.length > 0) {
        keys.sort(); 
        let bals = window.monthlyBalances[keys[keys.length - 1]];
        let parts = keys[keys.length - 1].split('-');
        let mNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        let prevMonth = parseInt(parts[1], 10) - 1, prevYear = parseInt(parts[0], 10);
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        
        let tEl = document.getElementById('cloudLastMonthTitle');
        if(tEl) tEl.innerText = "היתרות המעודכנות לאחר סגירת חודש " + mNames[prevMonth - 1] + " " + prevYear + ":";
        ['Reg','Shab','Sick','Dec','Cho'].forEach(k => { 
            let cEl = document.getElementById('cloud'+k);
            if(cEl) cEl.innerText = (bals[k.toLowerCase()] || 0).toFixed(2); 
        });
        let pEl = document.getElementById('cloudBalancesPanel');
        if(pEl) pEl.style.display = 'flex';
    } else { 
        let pEl = document.getElementById('cloudBalancesPanel');
        if(pEl) pEl.style.display = 'none'; 
    }
}

const maintenanceOverlay = document.getElementById('maintenanceOverlay');
db.collection("system").doc("settings").onSnapshot((doc) => {
    if (doc.exists && doc.data().maintenanceMode === true) {
        if(maintenanceOverlay) maintenanceOverlay.style.display = 'flex'; 
        if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'none'; 
        if(document.getElementById('forcePasswordScreen')) document.getElementById('forcePasswordScreen').style.display = 'none';
        window.wasInMaintenance = true;
    } else {
        if (window.wasInMaintenance) window.location.href = window.location.pathname + '?v=' + new Date().getTime();
        else if(maintenanceOverlay) maintenanceOverlay.style.display = 'none';
    }
});

window.loadData = () => { var el = document.getElementById('fileLoader'); if (el) el.click(); };
window.handleFileLoad = function(event) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (!data || typeof data !== 'object' || !Array.isArray(data.shifts)) {
                event.target.value = '';
                customAlert("הקובץ אינו גליון תקין של COT (חסר מערך משמרות). ודא שבחרת קובץ שנשמר מהמערכת.");
                return;
            }
            var fileKey = (data.year && data.month) ? data.year + "-" + pad2(data.month) : null;
            var fileCarryVal = data.monthCarryOver !== undefined ? parseInt(data.monthCarryOver, 10) : (data.carryOver && fileKey && data.carryOver[fileKey] !== undefined ? parseInt(data.carryOver[fileKey], 10) : undefined);
            var cloudCarryVal = (fileKey && window.carryOverData[fileKey] !== undefined) ? parseInt(window.carryOverData[fileKey], 10) : undefined;
            var resolvedCarryVal = undefined, hasConflict = false, hasBalanceConflict = false;

            if (fileKey && cloudCarryVal !== undefined && fileCarryVal !== undefined && cloudCarryVal !== fileCarryVal && !isNaN(cloudCarryVal) && !isNaN(fileCarryVal)) {
                hasConflict = true;
                let newVal = await customPrompt(`זיהינו סתירה! 🚨<br>בענן רשומות <b>${cloudCarryVal}</b> משמרות מחודש קודם, ובקובץ <b>${fileCarryVal}</b>.<br><br><b>תבדוק שוב את המשמרות והזן כאן את הערך הנכון:</b>`);
                let parsedVal = parseInt(newVal, 10);
                if (!isNaN(parsedVal) && parsedVal >= 0) resolvedCarryVal = parsedVal;
                else { resolvedCarryVal = cloudCarryVal; customAlert("הוזן ערך לא תקין. המערכת תשתמש בנתוני הענן כברירת מחדל."); }
            }
            if (data.carryOver) Object.assign(window.carryOverData, data.carryOver);
            if (fileCarryVal !== undefined && fileKey) window.carryOverData[fileKey] = fileCarryVal;
            if (resolvedCarryVal !== undefined && fileKey) window.carryOverData[fileKey] = resolvedCarryVal;

            if (fileKey) {
                let fBals = { reg: data.monthBalances?.reg ?? parseFloat(data.bal_open_reg||0), shab: data.monthBalances?.shab ?? parseFloat(data.bal_open_shab||0), sick: data.monthBalances?.sick ?? parseFloat(data.bal_open_sick||0), dec: data.monthBalances?.dec ?? parseFloat(data.bal_open_dec||0), cho: data.monthBalances?.cho ?? parseFloat(data.bal_open_cho||0) };
                
                let activeMonthKey = window.getActiveMonthKey();
                let cBal = window.monthlyBalances[fileKey];

                if (fileKey === activeMonthKey && cBal && Object.keys(cBal).length > 0) {
                    fBals = { ...cBal };
                    hasBalanceConflict = false;
                } else if (fileKey !== activeMonthKey && cBal) {
                    if (Object.keys(fBals).some(k => Math.abs(fBals[k] - cBal[k]) > 0.01)) {
                        hasBalanceConflict = true;
                    }
                }
                
                window.monthlyBalances[fileKey] = fBals;
                ['reg','shab','sick','dec','cho'].forEach(k => {
                    let el = document.getElementById('bal_open_' + k);
                    if(el) el.value = fBals[k].toFixed(2);
                });
            }

            if (data.month && data.year) {
                let sel = document.getElementById('monthYearSelect');
                if(sel) sel.value = data.year + "-" + pad2(data.month);
            }
            if (data.hourlyRate) { let h = document.getElementById('hourlyRate'); if(h) h.value = data.hourlyRate; }
            if (data.eshelRate) { let e = document.getElementById('eshelRate'); if(e) e.value = data.eshelRate; }
            if (data.employeeName !== undefined) { let en = document.getElementById('employeeName'); if(en) en.value = data.employeeName; }

            updateTitles(); generateTable(); 

            ['bal_open_reg', 'bal_open_shab', 'bal_open_sick', 'bal_open_dec', 'bal_open_cho'].forEach(id => {
                let el = document.getElementById(id); if(el) { el.readOnly = true; el.classList.add('locked-input'); if(el.nextElementSibling) el.nextElementSibling.innerText = '🔒'; }
            });

            var rows = document.getElementById('tbody').querySelectorAll('tr');
            // חישוב הסיכומים נדחה לסוף הטעינה (תוצאה זהה, בלי 31 סריקות מיותרות)
            window.runTotalsBatch(function() {
                for (var i = 0; i < rows.length && i < data.shifts.length; i++) {
                    if(!rows[i]) continue;
                    var sInp = rows[i].querySelector('.shift-type-input'), tInps = rows[i].querySelectorAll('.time-input');
                    if (sInp) sInp.value = data.shifts[i].shiftType || '';
                    if (tInps.length >= 2) { tInps[0].value = data.shifts[i].start || ''; tInps[1].value = data.shifts[i].end || ''; calculateRow(tInps[0]); }
                }
            });
            window.__cotDirty = false;
            event.target.value = '';
            
            var msg = hasConflict ? 'הנתונים נטענו והסתירה תוקנה ועודכנה בשני המקומות!' : 'הנתונים מהקובץ נטענו בהצלחה לצפייה!';
            if (hasBalanceConflict) msg = 'הנתונים נטענו לצפייה.<br><br>⚠️ <b>קיימת סתירה במוני החופשים! יש לבדוק שוב שיתרות הפתיחה הוקלדו נכון (פה נקודת התיקון של היתרות).</b>';
            
            if (hasConflict && firebase.auth().currentUser && !window.isBypassed) db.collection("users").doc(firebase.auth().currentUser.uid).set({carryOver: window.carryOverData}, { merge: true });
            customAlert(msg);
        } catch(err) { customAlert("שגיאה בטעינת הקובץ."); }
    };
    reader.readAsText(file);
};

// --- שמירת טיוטה לפני רענון כפוי (עדכון גרסה), ושחזורה אוטומטית אחרי הטעינה מחדש ---
// זה חוסך רק את מה שהוקלד בגיליון עצמו (לא נשמר בענן עד "שמור גליון") - שם, תעריפים, חודש ומשמרות.

window.captureDraftSnapshot = function() {
    var tc = document.getElementById('tableContainer');
    if (!tc || tc.style.display === 'none') return null; // אין גליון פתוח - אין מה לשמור
    var ym = getSelectedMonthYear();
    var shiftsArr = [];
    for (var i = 1; i <= 31; i++) {
        var tr = document.querySelector('#tbody tr:nth-child(' + i + ')'); if (!tr) continue;
        var sType = tr.querySelector('.shift-type-input'), tInps = tr.querySelectorAll('.time-input');
        if (sType && tInps.length >= 2) shiftsArr.push({ shiftType: sType.value, start: tInps[0].value, end: tInps[1].value });
    }
    return {
        year: ym.y, month: ym.m,
        employeeName: document.getElementById('employeeName')?.value || '',
        hourlyRate: document.getElementById('hourlyRate')?.value || '',
        eshelRate: document.getElementById('eshelRate')?.value || '',
        shifts: shiftsArr
    };
};

window.saveDraftBeforeRefresh = function() {
    if (!window.__cotDirty) return; // שום דבר לא הוקלד שלא נשמר - אין צורך בטיוטה
    var snap = window.captureDraftSnapshot();
    if (!snap) return;
    try { sessionStorage.setItem('cotDraftSnapshot', JSON.stringify(snap)); } catch (e) { console.error("Draft save failed:", e); }
};

window.restoreDraftSnapshot = function() {
    var raw;
    try { raw = sessionStorage.getItem('cotDraftSnapshot'); } catch (e) { return; }
    if (!raw) return;
    try { sessionStorage.removeItem('cotDraftSnapshot'); } catch (e) {}
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || !Array.isArray(data.shifts)) return;

    if (data.employeeName) { let en = document.getElementById('employeeName'); if (en) en.value = data.employeeName; }
    if (data.hourlyRate) { let h = document.getElementById('hourlyRate'); if (h) h.value = data.hourlyRate; }
    if (data.eshelRate) { let e = document.getElementById('eshelRate'); if (e) e.value = data.eshelRate; }
    if (data.year && data.month) { let sel = document.getElementById('monthYearSelect'); if (sel) sel.value = data.year + "-" + pad2(data.month); }

    generateTable();

    var rows = document.getElementById('tbody').querySelectorAll('tr');
    window.runTotalsBatch(function() {
        for (var i = 0; i < rows.length && i < data.shifts.length; i++) {
            if (!rows[i]) continue;
            var sInp = rows[i].querySelector('.shift-type-input'), tInps = rows[i].querySelectorAll('.time-input');
            if (sInp) sInp.value = data.shifts[i].shiftType || '';
            if (tInps.length >= 2) { tInps[0].value = data.shifts[i].start || ''; tInps[1].value = data.shifts[i].end || ''; calculateRow(tInps[0]); }
        }
    });
    window.__cotDirty = true; // הטיוטה ששוחזרה עדיין לא נשמרה בפועל - נשאיר את אזהרת היציאה פעילה
    customAlert("המערכת התעדכנה לגרסה חדשה. שחזרנו את ההזנות שהקלדת לפני הרענון - מומלץ ללחוץ \"שמור גליון\" כדי לשמור אותן.");
};

window.saveData = async function(silent = false) {
    var empNameEl = document.getElementById('employeeName');
    var empName = empNameEl ? empNameEl.value.trim() : "";
    if(!empName) { if(!silent) customAlert("הכנס שם עובד לפני השמירה."); return; }
    
    var isUnlocked = ['bal_open_reg', 'bal_open_shab', 'bal_open_sick', 'bal_open_dec', 'bal_open_cho'].some(id => {
        let el = document.getElementById(id); return el && !el.readOnly;
    });
    
    var ym = getSelectedMonthYear(), curKey = ym.y + "-" + pad2(ym.m);

    var currentBalances = { 
        reg: parseFloat(document.getElementById('bal_open_reg')?.value)||0, 
        shab: parseFloat(document.getElementById('bal_open_shab')?.value)||0, 
        sick: parseFloat(document.getElementById('bal_open_sick')?.value)||0, 
        dec: parseFloat(document.getElementById('bal_open_dec')?.value)||0, 
        cho: parseFloat(document.getElementById('bal_open_cho')?.value)||0 
    };
    
    var shiftsArr = [];
    for (var i = 1; i <= 31; i++) {
        var tr = document.querySelector('#tbody tr:nth-child(' + i + ')'); if(!tr) continue;
        var sType = tr.querySelector('.shift-type-input'), tInps = tr.querySelectorAll('.time-input');
        if(sType && tInps.length >= 2) shiftsArr.push({ shiftType: sType.value, start: tInps[0].value, end: tInps[1].value });
    }

    var data = {
        schemaVersion: 1, employeeName: empName, hourlyRate: document.getElementById('hourlyRate')?.value||0, eshelRate: document.getElementById('eshelRate')?.value||0,
        carryOver: window.carryOverData, monthCarryOver: window.carryOverData[curKey] !== undefined ? window.carryOverData[curKey] : 0,
        monthlyBalances: window.monthlyBalances, monthBalances: currentBalances, year: ym.y, month: ym.m, shifts: shiftsArr
    };
    
    var cloudFailed = false;
    var CLOUD_FAIL_MSG = "הקובץ נשמר, אך השמירה בענן נכשלה (בעיית תקשורת). בדוק חיבור לרשת ולחץ שוב על \"שמור גליון\".";
    var user = firebase.auth().currentUser;
    if (user && !window.isBypassed) {
        // התראה על שמירה דורסת: בודקים אם מישהו אחר (טאב/מכשיר נוסף) שמר לענן מאז שהעמוד הזה נטען,
        // לפני שדורסים את זה בשקט. לא רלוונטי לשמירה שקטה (silent) כדי לא להפריע בזמן יציאה אוטומטית.
        if (!silent && window.__lastKnownRemoteState) {
            try {
                var freshDoc = await db.collection("users").doc(user.uid).get();
                if (freshDoc.exists) {
                    var fd = freshDoc.data();
                    var freshState = JSON.stringify({ monthlyBalances: fd.monthlyBalances || {}, carryOver: fd.carryOver || {} });
                    if (freshState !== window.__lastKnownRemoteState) {
                        var proceed = await customConfirm("שינויים נוספים נשמרו לענן מאז שטענת את המסך הזה (כנראה ממכשיר או טאב אחר).<br>שמירה כעת <b>תדרוס</b> אותם. להמשיך בכל זאת?");
                        if (!proceed) return;
                    }
                }
            } catch (err) { console.error("Collision check failed (continuing with save):", err); }
        }
        try {
            await Promise.all([
                user.updateProfile({ displayName: empName }),
                db.collection("users").doc(user.uid).set({employeeName: data.employeeName, hourlyRate: data.hourlyRate, eshelRate: data.eshelRate, carryOver: data.carryOver}, { merge: true })
            ]);
            window.__lastKnownRemoteState = JSON.stringify({ monthlyBalances: window.monthlyBalances, carryOver: window.carryOverData });
        } catch (err) { console.error("Cloud save failed:", err); cloudFailed = true; }
        if (isUnlocked && !silent) {
            let ans = await customConfirm("שמנו לב ששינית את יתרות הפתיחה באופן ידני.<br>האם לעדכן יתרות אלו <b>גם בענן לשימוש קבוע</b>?<br><span style='font-size:12px;'>(לחיצה על 'ביטול' תשמור רק לקובץ המקומי)</span>");
            if(ans) {
                var prevBal = window.monthlyBalances[curKey];
                window.monthlyBalances[curKey] = currentBalances;
                try {
                    await db.collection("users").doc(user.uid).set({monthlyBalances: window.monthlyBalances}, { merge: true });
                    updateCloudBalancesPanel(); customAlert("היתרות החדשות עודכנו בענן בהצלחה.");
                } catch (err) {
                    console.error("Balances cloud save failed:", err);
                    if (prevBal === undefined) delete window.monthlyBalances[curKey]; else window.monthlyBalances[curKey] = prevBal;
                    cloudFailed = true;
                }
            }
        }
    }
    
    if (!silent) {
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var fileName = "COT_משמרות_" + empName.replace(/\s+/g, '_') + "_" + curKey + ".json";
        let useFallback = true;
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'JSON File', accept: {'application/json': ['.json']} }] });
                const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); useFallback = false;
            } catch (err) { if (err.name === 'AbortError') { if (cloudFailed) customAlert(CLOUD_FAIL_MSG); return; } }
        }
        if (useFallback) {
            var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
        ['bal_open_reg', 'bal_open_shab', 'bal_open_sick', 'bal_open_dec', 'bal_open_cho'].forEach(id => {
            let inp = document.getElementById(id); if(inp) { inp.readOnly = true; inp.classList.add('locked-input'); if(inp.nextElementSibling) inp.nextElementSibling.innerText = '🔒'; }
        });
        window.__cotDirty = false;
        if (cloudFailed) customAlert(CLOUD_FAIL_MSG);
        else if(!isUnlocked) customAlert("הגליון נשמר בהצלחה והורד למחשב שלך.");
    }
};

window.closeMonth = async function() {
    let ans = await customConfirm("פעולה זו תשמור את יתרות הסיום כיתרות פתיחה לחודש הבא בענן. האם להמשיך?"); if(!ans) return;

    var ym = getSelectedMonthYear(), curKey = ym.y + "-" + pad2(ym.m);
    var nextM = ym.m + 1, nextY = ym.y; if (nextM > 12) { nextM = 1; nextY++; }
    var nextKey = nextY + "-" + pad2(nextM);
    var prevBalancesSnap = JSON.parse(JSON.stringify(window.monthlyBalances)), prevCarrySnap = JSON.parse(JSON.stringify(window.carryOverData));

    window.monthlyBalances[curKey] = { 
        reg: parseFloat(document.getElementById('bal_open_reg')?.value)||0, 
        shab: parseFloat(document.getElementById('bal_open_shab')?.value)||0, 
        sick: parseFloat(document.getElementById('bal_open_sick')?.value)||0, 
        dec: parseFloat(document.getElementById('bal_open_dec')?.value)||0, 
        cho: parseFloat(document.getElementById('bal_open_cho')?.value)||0 
    };
    window.monthlyBalances[nextKey] = {
        reg: parseFloat(document.getElementById('bal_close_reg')?.innerText)||0,
        shab: parseFloat(document.getElementById('bal_close_shab')?.innerText)||0,
        sick: parseFloat(document.getElementById('bal_close_sick')?.innerText)||0,
        dec: (parseFloat(document.getElementById('bal_open_dec')?.value)||0) - (parseFloat(document.getElementById('bal_used_dec')?.innerText)||0),
        cho: (parseFloat(document.getElementById('bal_open_cho')?.value)||0) - (parseFloat(document.getElementById('bal_used_cho')?.innerText)||0)
    };

    var daysInMonth = new Date(ym.y, ym.m, 0).getDate(), lastSunday = 1, tailShifts = 0;
    if (new Date(ym.y, ym.m - 1, daysInMonth).getDay() !== 6) {
        for (var i = daysInMonth; i >= 1; i--) { if (new Date(ym.y, ym.m - 1, i).getDay() === 0) { lastSunday = i; break; } }
        for (var r = lastSunday; r <= daysInMonth; r++) {
            var valC = document.getElementById('val-cost-' + r), shiftInput = document.querySelector('#tbody tr:nth-child(' + r + ') .shift-type-input');
            if (valC && (window.ABSENCE_CODES.includes(shiftInput?shiftInput.value.trim():'') || valC.getAttribute('data-is-shift') === '1')) tailShifts++;
        }
    }
    window.carryOverData[nextKey] = tailShifts;

    if (firebase.auth().currentUser && !window.isBypassed) {
        try {
            await db.collection("users").doc(firebase.auth().currentUser.uid).set({ carryOver: window.carryOverData, monthlyBalances: window.monthlyBalances }, { merge: true });
            updateCloudBalancesPanel();
        } catch (err) {
            console.error("closeMonth cloud save failed:", err);
            window.monthlyBalances = prevBalancesSnap; window.carryOverData = prevCarrySnap;
            customAlert("סגירת החודש לא נשמרה בענן (בעיית תקשורת), ולכן הגליון לא נסגר.<br>בדוק חיבור לרשת ולחץ שוב על \"סגור חודש\".");
            return;
        }
    }
    customAlert("החודש נסגר בהצלחה! היתרות עברו לענן לחודשים הבאים."); if(window.clearData) window.clearData(false);
};

// clearData(true)  - איפוס מלא ושקט (התנתקות / החלפת משתמש / טעינת דף)
// clearData(false) - ניקוי הגליון לאחר סגירת חודש (ללא אישור)
// clearData()      - כפתור "אפס גליון": מבקש אישור ומנקה את ההזנות
window.clearData = async function(mode) {
    try {
        if (mode === true) {
            window.__cotDirty = false;
            var setVal = function(id, v) { var el = document.getElementById(id); if (el) el.value = v; };
            setVal('employeeName', ''); setVal('hourlyRate', '0.00'); setVal('eshelRate', '52.66');
            window.carryOverData = {}; window.monthlyBalances = {};
            var sel = document.getElementById('monthYearSelect');
            if (sel) { sel.innerHTML = ''; initMonthYearSelect(); }
            ['reg','shab','sick','dec','cho'].forEach(function(k) {
                var el = document.getElementById('bal_open_' + k);
                if (el) { el.value = '0.00'; el.readOnly = true; el.classList.add('locked-input'); if (el.nextElementSibling) el.nextElementSibling.innerText = '🔒'; }
            });
            var tb = document.getElementById('tbody'); if (tb) tb.innerHTML = '';
            ['tableContainer','summaryPanel','kpiRow','printBtn','exportExcelBtn','exportPdfBtn','closeMonthBtn','weeklyWarning','cloudBalancesPanel','securityBanner'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.style.display = 'none';
            });
            updateTitles(); updateGrandTotal();
            return;
        }
        var tc = document.getElementById('tableContainer');
        if (!tc || tc.style.display === 'none') return;
        if (mode !== false) {
            var ok = await customConfirm("לאפס את כל ההזנות בגליון הנוכחי?<br><span style='font-size:12px;'>(הפעולה אינה מוחקת נתונים שנשמרו בענן או בקובץ)</span>");
            if (!ok) return;
        }
        generateTable();
        window.__cotDirty = false;
    } catch (e) { console.error("clearData failed:", e); }
};

// פותח את חלון "משמרות מסוף חודש שעבר", הן אוטומטית (ym, prefill=0) והן מרצון לתיקון מאוחר יותר
// (prefill = הערך הקיים כרגע עבור החודש הנבחר).
window.openCarryModal = function(prefill) {
    var ym = getSelectedMonthYear();
    var prevMonthLastDay = new Date(ym.y, ym.m - 1, 0);
    var maxAllowed = prevMonthLastDay.getDay() + 1;
    let mInp = document.getElementById('manualCarryInput');
    if (mInp) { mInp.max = maxAllowed; mInp.value = String(prefill); }
    let cmInfo = document.getElementById('carryMaxInfo');
    if (cmInfo) cmInfo.innerText = "(מקסימום אפשרי לחודש זה: " + maxAllowed + ")";
    let fMod = document.getElementById('firstMonthCarryModal');
    if (fMod) fMod.style.display = 'block';
    if (mInp) setTimeout(() => mInp.focus(), 100);
};

window.saveFirstMonthCarry = function() {
    let mcEl = document.getElementById('manualCarryInput');
    if(!mcEl) return;
    var val = parseInt(mcEl.value, 10), maxAllowed = parseInt(mcEl.max, 10) || 6;
    if(isNaN(val) || val < 0) val = 0;
    if (val > maxAllowed) return customAlert("שים לב: הכמות המקסימלית האפשרית של משמרות בשבוע האחרון של החודש שעבר היא " + maxAllowed + ".");
    
    window.carryOverData[getSelectedMonthYear().y + "-" + pad2(getSelectedMonthYear().m)] = val;
    window.saveData(true); 
    let mod = document.getElementById('firstMonthCarryModal');
    if(mod) mod.style.display = 'none'; 
    updateGrandTotal(); 
};

