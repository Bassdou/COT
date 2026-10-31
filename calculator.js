/* COT System Version: V202610310345 */
// קובץ: calculator.js (מנוע החישוב)
// המוח של המערכת: בניית הטבלה, זיהוי משמרת/היעדרות, וכל נוסחאות השעות הנוספות, השבת, הלילה ומעבר השעון. זהו הקובץ היחיד שיש לערפל (obfuscator.io) - הוא היחיד שצריך להישאר קבוע בשם calculator.js.

var daysHebrew = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
var columnsData = [
    { id: 'I', factor: 0.0 }, { id: 'I2', factor: 0.0 }, { id: 'J', factor: 1.0 }, { id: 'K', factor: 1.25 }, { id: 'L', factor: 1.5 }, 
    { id: 'M', factor: 1.75 }, { id: 'N', factor: 2.0 }, { id: 'O', factor: 1.8 }, { id: 'P', factor: 1.875 }, 
    { id: 'Q', factor: 2.25 }, { id: 'R', factor: 2.5 }, { id: 'S', factor: 0.2 }, { id: 'T', factor: 0.5 }, 
    { id: 'U', factor: 0.75 }, { id: 'V', factor: 0.875 }, { id: 'W', factor: 1.0 }
];

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function initMonthYearSelect() {
    var sel = document.getElementById('monthYearSelect'); if(!sel || sel.options.length > 0) return;
    var months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"], now = new Date();
    var prevM = now.getMonth(), prevY = now.getFullYear(); if(prevM===0){prevM=12;prevY--;}
    for (var y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
        for (var m = 1; m <= 12; m++) {
            var opt = document.createElement('option'); opt.value = y + "-" + pad2(m); opt.text = months[m-1] + " " + y;
            if (y === prevY && m === prevM) opt.selected = true; if(sel) sel.add(opt);
        }
    }
}
function getSelectedMonthYear() {
    var sel = document.getElementById('monthYearSelect');
    var val = sel ? sel.value : null;
    if(!val) return { y: new Date().getFullYear(), m: new Date().getMonth()+1 };
    return { y: parseInt(val.split('-')[0], 10), m: parseInt(val.split('-')[1], 10) };
}
function updateTitles() {
    var empNameEl = document.getElementById('employeeName');
    var sel = document.getElementById('monthYearSelect');
    if (!empNameEl || !sel) return;
    
    var empName = empNameEl.value.trim();
    var selText = sel.options[sel.selectedIndex].text;
    
    let pm = document.getElementById('printMonthYearText');
    if(pm) pm.innerText = selText;
    
    var sheetTitle = document.getElementById('sheetTitle'), printEmpDisplay = document.getElementById('printEmployeeNameDisplay');
    if (empName !== "") { 
        if(sheetTitle) sheetTitle.innerText = "דוח שעות משמרות - " + selText + " | עבור: " + empName; 
        if(printEmpDisplay) { printEmpDisplay.innerText = "| עבור: " + empName; printEmpDisplay.style.display = "inline-block"; }
    } else { 
        if(sheetTitle) sheetTitle.innerText = "דוח שעות משמרות - " + selText; 
        if(printEmpDisplay) printEmpDisplay.style.display = "none"; 
    }
    document.title = (empName ? empName.replace(/\s+/g, '_') : "נתוני_משמרות") + "_" + selText.replace(' ', '_');
}

window.formatTimeInput = function(input) {
    var originalVal = input.value.trim();
    if (originalVal === '') { input.value = ''; calculateRow(input); return; }
    var val = originalVal.replace(/[^\d]/g, '');
    if (val === '') input.value = '';
    else if (val.length <= 2) input.value = pad2(Math.min(parseInt(val, 10), 23)) + ':00';
    else if (val.length === 3) input.value = '0' + parseInt(val.substring(0, 1), 10) + ':' + pad2(Math.min(parseInt(val.substring(1, 3), 10), 59));
    else input.value = pad2(Math.min(parseInt(val.substring(0, 2), 10), 23)) + ':' + pad2(Math.min(parseInt(val.substring(2, 4), 10), 59));
    calculateRow(input);
};

window.generateTable = function() {
    var empNameEl = document.getElementById('employeeName');
    var empName = empNameEl ? empNameEl.value.trim() : '';
    if (!empName) { customAlert("הכנס שם עובד"); if(empNameEl) empNameEl.focus(); return; }

    var ym = getSelectedMonthYear(), curKey = ym.y + "-" + pad2(ym.m);
    var eshelRate = parseFloat(document.getElementById('eshelRate')?.value)||0;
    if ([1, 4, 7, 10].includes(ym.m) && eshelRate < MINIMUM_ESHEL_RATE) customAlert("שים לב, תחילת רבעון: תעריף האש\"ל המעודכן הוא " + MINIMUM_ESHEL_RATE + " ₪. נא לעדכן בהתאם.");

    if (window.carryOverData[curKey] === undefined) {
        var prevMonthLastDay = new Date(ym.y, ym.m - 1, 0); 
        if (prevMonthLastDay.getDay() === 6) window.carryOverData[curKey] = 0;
        else {
            let mInp = document.getElementById('manualCarryInput');
            if(mInp) { mInp.max = prevMonthLastDay.getDay() + 1; mInp.value = "0"; }
            let cmInfo = document.getElementById('carryMaxInfo');
            if(cmInfo) cmInfo.innerText = "(מקסימום אפשרי לחודש זה: " + (prevMonthLastDay.getDay() + 1) + ")";
            let fMod = document.getElementById('firstMonthCarryModal');
            if(fMod) fMod.style.display = 'block';
        }
    }

    updateTitles();
    
    let b = window.monthlyBalances[curKey] || {reg:0,shab:0,sick:0,dec:0,cho:0};
    ['reg','shab','sick','dec','cho'].forEach(k => {
        let el = document.getElementById('bal_open_' + k);
        if(el) { el.value = b[k].toFixed(2); el.readOnly = true; el.classList.add('locked-input'); if(el.nextElementSibling) el.nextElementSibling.innerText = '🔒'; }
    });

    var daysInMonth = new Date(ym.y, ym.m, 0).getDate(), tbody = document.getElementById('tbody'), htmlContent = '', weekToggle = 0; 
    for (var i = 1; i <= daysInMonth; i++) {
        var dayNum = new Date(ym.y, ym.m - 1, i).getDay(); 
        if (dayNum === 0 && i > 1) weekToggle = 1 - weekToggle;
        
        var dayClass = (dayNum === 5) ? "day-fri" : (dayNum === 6) ? "day-sat" : "", trClass = (dayNum === 6) ? "row-sat" : "";
        var holObj = (window.HOLIDAYS_DB && window.HOLIDAYS_DB[ym.y + "-" + pad2(ym.m) + "-" + pad2(i)]) ? window.HOLIDAYS_DB[ym.y + "-" + pad2(ym.m) + "-" + pad2(i)] : null;
        var holText = holObj ? holObj.hebrew.split('(')[0].trim() : '';

        htmlContent += '<tr class="' + trClass + '" style="background-color: ' + (weekToggle === 0 ? "#e8f5e9" : "#fff3e0") + ';">' +
            '<td class="'+dayClass+'" style="width: 30px; min-width: 30px;">' + pad2(i) + '</td>' +
            '<td class="'+dayClass+' col-sep" style="width: 30px; min-width: 30px;">' + daysHebrew[dayNum] + '</td>' +
            '<td class="'+dayClass+' col-sep hide-print"><input type="text" class="shift-type-input" maxlength="3" style="width: 35px;" onchange="handleShiftType(this)"></td>' +
            '<td class="'+dayClass+' print-thick-right"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)" data-date="'+ym.y+'-'+ym.m+'-'+i+'"></td>' +
            '<td class="col-sep '+dayClass+'"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)"></td>' +
            '<td class="'+dayClass+' col-sep" id="val-desc-'+i+'" style="font-size: 12px; font-weight: bold; background-color: rgba(248, 251, 255, 0.5); text-align: right; padding-right: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" data-hol="'+holText+'"><span style="color:#e67e22">' + holText + '</span></td>' +
            '<td class="val-cell '+dayClass+'" id="val-total-hours-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+'" id="val-shabbat-hours-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+'" id="val-I-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-I2-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-J-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-K-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-L-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-M-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-N-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-O-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-P-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-Q-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-R-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-S-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-T-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-U-'+i+'" data-val="0"></td>' +
            '<td class="val-cell '+dayClass+'" id="val-V-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-W-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-cost-'+i+'" data-is-shift="0" data-cost="0" data-gross="0"></td>' +
        '</tr>';
    }
    if (tbody) tbody.innerHTML = htmlContent;
    
    var activeMonthKey = window.getActiveMonthKey();
    var closeBtn = document.getElementById('closeMonthBtn');
    
    if (closeBtn) {
        if (!activeMonthKey || curKey === activeMonthKey) {
            closeBtn.innerText = 'סגור חודש';
            closeBtn.onclick = function() { closeMonth(); };
            closeBtn.style.backgroundColor = '';
        } else {
            closeBtn.innerText = 'שמור גליון';
            closeBtn.onclick = function() { saveData(); };
            closeBtn.style.backgroundColor = '#2980b9';
        }
    }

    ['tableContainer','summaryPanel','kpiRow','printBtn','exportExcelBtn','closeMonthBtn'].forEach(id => {
        let el = document.getElementById(id);
        if(!el) return;
        el.style.display = (id==='summaryPanel' || id==='kpiRow') ? 'flex' : 'inline-block';
    });
    if(document.getElementById('tableContainer')) document.getElementById('tableContainer').style.display = 'block'; 
    updateGrandTotal();
};

window.handleShiftType = function(input) {
    var val = input.value.trim().replace(/"/g, '').replace(/'/g, ''), tr = input.closest('tr'); if (!tr) return;
    var timeInputs = tr.querySelectorAll('.time-input'); if (!timeInputs || timeInputs.length < 2) return;

    var dateStr = timeInputs[0].getAttribute('data-date');
    if (dateStr) {
        var dayNum = new Date(dateStr.split('-')[0], parseInt(dateStr.split('-')[1], 10)-1, dateStr.split('-')[2]).getDay();
        
        if ((dayNum === 5 || dayNum === 6) && window.WEEKEND_BLOCKED_ABSENCE_CODES.includes(val)) {
            customAlert("שים לב: לא ניתן להזין היעדרות מסוג זה בסופ\"ש (למעט 'מח' ו-'מיל').");
            input.value = ''; val = '';
        }
    }

    var shifts = window.SHIFT_CODES;
    if (shifts[val]) {
        timeInputs[0].value = shifts[val][0]; timeInputs[1].value = shifts[val][1]; timeInputs[0].classList.remove('empty-print'); timeInputs[1].classList.remove('empty-print');
    } else if (window.ABSENCE_CODES.includes(val) || val === '') {
        timeInputs[0].value = ''; timeInputs[1].value = ''; timeInputs[0].classList.add('empty-print'); timeInputs[1].classList.add('empty-print');
    }
    calculateRow(timeInputs[0]);
};

window.calculateRow = function(inputElem) {
    try {
        var tr = inputElem.closest('tr'), timeInputs = tr.querySelectorAll('.time-input'), startInput = timeInputs[0].value, endInput = timeInputs[1].value;
        if (startInput) timeInputs[0].classList.remove('empty-print'); else timeInputs[0].classList.add('empty-print');
        if (endInput) timeInputs[1].classList.remove('empty-print'); else timeInputs[1].classList.add('empty-print');

        var dateString = timeInputs[0].getAttribute('data-date'), rowId = dateString.split('-')[2]; 
        var costCell = document.getElementById('val-cost-' + rowId), totalHoursCell = document.getElementById('val-total-hours-' + rowId), shabbatHoursCell = document.getElementById('val-shabbat-hours-' + rowId);
        var shiftVal = (tr.querySelector('.shift-type-input') ? tr.querySelector('.shift-type-input').value.trim() : '').replace(/"/g, '').replace(/'/g, '');
        var isAbs = window.ABSENCE_CODES.includes(shiftVal);

        var shiftMonth = parseInt(dateString.split('-')[1], 10), shiftDate = new Date(dateString.split('-')[0], shiftMonth-1, dateString.split('-')[2]), baseDay = shiftDate.getDay() + 1; 
        var baseDateStr = shiftDate.getFullYear() + "-" + pad2(shiftDate.getMonth()+1) + "-" + pad2(shiftDate.getDate()), baseHolObj = window.HOLIDAYS_DB ? window.HOLIDAYS_DB[baseDateStr] : null;

        if (!startInput || !endInput || startInput.indexOf(':') === -1 || endInput.indexOf(':') === -1) {
            let grantsTeken = false;
            let tekenHours = 0;
            let invalidWeekendAbsence = false;

            if (isAbs) {
                if ((baseDay === 6 || baseDay === 7) && window.WEEKEND_BLOCKED_ABSENCE_CODES.includes(shiftVal)) {
                    grantsTeken = false;
                    invalidWeekendAbsence = true;
                } else {
                    grantsTeken = !(shiftVal === 'מיל' && (baseDay === 6 || baseDay === 7));
                    
                    if (shiftVal === 'מח' || shiftVal === 'מבמ') {
                        if (baseHolObj && baseHolObj.standardHours !== undefined) {
                            tekenHours = baseHolObj.standardHours;
                        } else if (baseDay === 6) {
                            tekenHours = 6.5; 
                        } else if (baseDay === 7) {
                            tekenHours = 8.0; 
                        } else {
                            tekenHours = 8.0; 
                        }
                    } else {
                        tekenHours = 8.0;
                    }
                }
            }

            if (totalHoursCell) { 
                if(grantsTeken && tekenHours > 0) { 
                    totalHoursCell.innerHTML = '<span style="color:#8e44ad; font-weight:bold;">' + tekenHours.toFixed(2) + '</span>'; 
                    totalHoursCell.setAttribute('data-val', tekenHours); 
                } 
                else { totalHoursCell.innerText = ''; totalHoursCell.setAttribute('data-val', '0'); }
            }
            
            if (shabbatHoursCell) {
                if (shiftVal === 'חש') { shabbatHoursCell.innerHTML = '<span style="color:#e74c3c; display:block; text-align:left;" dir="ltr">-1.00</span>'; shabbatHoursCell.setAttribute('data-val', '-1'); } 
                else { shabbatHoursCell.innerText = ''; shabbatHoursCell.setAttribute('data-val', '0'); }
            }
            
            for(var c = 0; c < columnsData.length; c++) {
                var cell1 = document.getElementById('val-' + columnsData[c].id + '-' + rowId);
                if(cell1) { 
                    if (columnsData[c].id === 'I' && grantsTeken && tekenHours > 0) { 
                        cell1.innerHTML = '<span style="color:#8e44ad; font-weight:bold;">' + tekenHours.toFixed(2) + '</span>'; 
                        cell1.setAttribute('data-val', tekenHours); 
                    } 
                    else { cell1.innerText = ''; cell1.setAttribute('data-val', '0'); }
                }
            }
            if(costCell) { costCell.innerText = ''; costCell.setAttribute('data-is-shift', '0'); costCell.setAttribute('data-cost', '0'); costCell.setAttribute('data-gross', '0'); }
            
            var descCellAbs = document.getElementById('val-desc-' + rowId);
            if (descCellAbs) {
                var holTextAbs = descCellAbs.getAttribute('data-hol') || '', baseDescAbs = '';
                if (isAbs) {
                    baseDescAbs = {'ח':'חופש','חש':'חופש שבת','מח':'מחלה','הצ':'הצהרה','בח':'בחירה','מבמ':'מחלת בן משפחה','הס':'עפ"י הסכם','מיל':'מילואים'}[shiftVal];
                }
                var baseDescHTMLAbs = '';
                if (baseDescAbs) baseDescHTMLAbs = '<span style="color:#1565c0">' + baseDescAbs + '</span>';
                if (holTextAbs) baseDescHTMLAbs += (baseDescHTMLAbs ? ' (<span style="color:#e67e22">' + holTextAbs + '</span>)' : '<span style="color:#e67e22">' + holTextAbs + '</span>');
                
                if (invalidWeekendAbsence) {
                    baseDescHTMLAbs += ' | <span style="color:#e74c3c; font-weight:bold;">לא מזכה בתקן בסופ\"ש</span>';
                }
                
                descCellAbs.innerHTML = baseDescHTMLAbs;
            }
            
            updateGrandTotal(); return;
        }

        var rate = parseFloat(document.getElementById('hourlyRate')?.value || 0);
        var startH = parseInt(startInput.split(':')[0], 10), startM = parseInt(startInput.split(':')[1], 10), endH = parseInt(endInput.split(':')[0], 10), endM = parseInt(endInput.split(':')[1], 10);
        var dStart = startH + startM / 60, dEnd = endH + endM / 60; if (dEnd <= dStart) dEnd += 24;
        
        var totalMinutes = Math.round((dEnd - dStart) * 60);

        var shiftStartTS = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), startH, startM).getTime();
        var shiftEndTS = shiftStartTS + totalMinutes * 60000;
        var dstYear = shiftDate.getFullYear();
        
        var oct31 = new Date(dstYear, 9, 31);
        var lastSundayOct = new Date(dstYear, 9, 31 - oct31.getDay());
        var dstFallbackTS = new Date(dstYear, 9, lastSundayOct.getDate(), 2, 0).getTime();
        
        var mar31 = new Date(dstYear, 2, 31);
        var lastSundayMar = new Date(dstYear, 2, 31 - mar31.getDay());
        var dstSpringTS = new Date(dstYear, 2, lastSundayMar.getDate() - 2, 2, 0).getTime();

        var isDstFallback = false;
        var isDstSpring = false;
        var minutesUntilTransition = 0;
        var physicalMinutes = totalMinutes;

        if (shiftStartTS < dstFallbackTS && shiftEndTS > dstFallbackTS) {
            isDstFallback = true;
            physicalMinutes += 60; 
            minutesUntilTransition = (dstFallbackTS - shiftStartTS) / 60000;
        } else if (shiftStartTS < dstSpringTS && shiftEndTS > dstSpringTS) {
            isDstSpring = true;
            physicalMinutes -= 60; 
            minutesUntilTransition = (dstSpringTS - shiftStartTS) / 60000;
        }
        
        var descCell = document.getElementById('val-desc-' + rowId);
        if (descCell) {
            var holText = descCell.getAttribute('data-hol') || '', baseDesc = 'נוכחות';
            var dstText = isDstFallback ? 'שעון חורף' : (isDstSpring ? 'שעון קיץ' : '');
            
            var baseDescHTML = `<span style="color:#1565c0">${baseDesc}</span>`;
            if (holText) baseDescHTML += ` (<span style="color:#e67e22">${holText}</span>)`;
            if (dstText) baseDescHTML += ` | <span style="color:#8e44ad; font-weight:bold;">${dstText}</span>`;
            
            descCell.innerHTML = baseDescHTML;
        }

        if (totalHoursCell) {
            if (physicalMinutes > 0) { totalHoursCell.innerText = (physicalMinutes/60).toFixed(2); totalHoursCell.setAttribute('data-val', physicalMinutes/60); } 
            else { totalHoursCell.innerText = ''; totalHoursCell.setAttribute('data-val', '0'); }
        }

        var nightMinutesCount = 0, afternoonMinutesCount = 0; 
        for (var i = 1; i <= physicalMinutes; i++) {
            var virtualI = i;
            if (isDstFallback && i > minutesUntilTransition) virtualI = i - 60;
            else if (isDstSpring && i > minutesUntilTransition) virtualI = i + 60;
            
            var cHourDec = (dStart + (virtualI - 0.5) / 60) % 24;
            if (cHourDec >= 22 || cHourDec < 6) nightMinutesCount++;
            if (cHourDec >= 14 && cHourDec < 22) afternoonMinutesCount++; 
        }
        var isNightShift = nightMinutesCount >= 120, qualifiesForAfternoon = (startH + startM/60 >= 14 || afternoonMinutesCount >= 180), enteredBefore3 = (startH + startM/60 >= 12 || startH + startM/60 <= 3.0);

        var m = { I:0, I2:0, J:0, K:0, L:0, M:0, N:0, O:0, P:0, Q:0, R:0, S:0, T:0, U:0, V:0, W:0 }, shabbatMinutesCount = 0;
        var isBaseDayErevHag = (baseHolObj && baseHolObj.type === 'eve'), isBaseDayHoliday = (baseHolObj && baseHolObj.type === 'holiday');

        if (baseDay === 6 && isBaseDayErevHag && !isNightShift) {
            var stdMins = baseHolObj?.standardHours ? (baseHolObj.standardHours * 60) : 330; 
            m.I = Math.min(physicalMinutes, stdMins); 
            m.J = Math.max(0, Math.min(physicalMinutes - stdMins, 60)); 
            m.K = Math.max(0, Math.min(physicalMinutes - (stdMins + 60), 120)); 
            m.L = m.O = Math.max(0, physicalMinutes - (stdMins + 180));                                       
        } else {
            var ot1_Mins = 8 * 60, ot2_Mins = 10 * 60;
            if (baseHolObj?.standardHours !== undefined && !isNightShift) { ot1_Mins = baseHolObj.standardHours * 60; ot2_Mins = ot1_Mins + 120; } 
            else if (baseDay === 6) { ot1_Mins = 6.5 * 60; ot2_Mins = 8.5 * 60; } 
            else if (isNightShift) { ot1_Mins = 7 * 60; ot2_Mins = 9 * 60; }

            for (var j = 1; j <= physicalMinutes; j++) {
                var virtualJ = j;
                if (isDstFallback && j > minutesUntilTransition) virtualJ = j - 60;
                else if (isDstSpring && j > minutesUntilTransition) virtualJ = j + 60;
                
                var absH = dStart + (virtualJ - 0.5) / 60; 
                var cDayNum2 = ((baseDay - 1 + Math.floor(absH / 24)) % 7) + 1, cHourDec2 = absH % 24;
                var minDate = new Date(shiftDate.getTime()); if (absH >= 24) minDate.setDate(minDate.getDate() + 1);
                var holObj = window.HOLIDAYS_DB?window.HOLIDAYS_DB[minDate.getFullYear()+"-"+pad2(minDate.getMonth()+1)+"-"+pad2(minDate.getDate())]:null;
                var prevDate = new Date(minDate.getTime()); prevDate.setDate(prevDate.getDate() - 1);
                var prevHolObj = window.HOLIDAYS_DB?window.HOLIDAYS_DB[prevDate.getFullYear()+"-"+pad2(prevDate.getMonth()+1)+"-"+pad2(prevDate.getDate())]:null;

                var isStrictShab = (cDayNum2 === 6 && cHourDec2 >= ((shiftMonth >= 4 && shiftMonth <= 9)?18:17)) || cDayNum2 === 7 || (cDayNum2 === 1 && cHourDec2 < 6) || holObj?.type === 'holiday' || (prevHolObj?.type === 'holiday' && cHourDec2 < 6);
                var isShab = isStrictShab || (isBaseDayHoliday && isNightShift) || baseDay === 7;
                if (isStrictShab && !(baseDay === 6 && isBaseDayErevHag && !isNightShift)) shabbatMinutesCount++;

                var isNight = (cHourDec2 >= 22 || cHourDec2 < 6) || (isNightShift && enteredBefore3 && absH >= (startH<6?6:30)) || (isBaseDayHoliday && isNightShift && j > ot1_Mins); 
                var payMult = isShab ? (isNight ? 2.0 : 1.75) : (isNight ? 1.5 : (cHourDec2 >= 14 && cHourDec2 < 22 && qualifiesForAfternoon ? 1.2 : 1.0));
                var otMult = j > ot2_Mins ? 1.5 : (j > ot1_Mins ? 1.25 : 1.0);
                var fMult = Math.round((isShab ? payMult + (otMult - 1) : payMult * otMult) * 1000) / 1000;
                
                if (otMult === 1.0) { if (isShab) { m.I++; if(payMult===1.75)m.U++; else if(payMult===2.0)m.W++; } else { m.I++; if(payMult===1.2)m.S++; else if(payMult===1.5)m.T++; } } 
                else {
                    if (fMult===1.25) m.K++; else if (fMult===1.5) m.L++; else if (fMult===1.75) m.M++; else if (fMult===1.8) m.O++; else if (fMult===1.875) m.P++; 
                    else if (fMult===2.0) m.N++; else if (fMult===2.25) m.Q++; else if (fMult===2.5) m.R++; else { if(!isShab && otMult===1.25)m.K++; else m.J++; }
                }
            }
        }
        m.I2 = m.I;
        
        if (shabbatHoursCell) {
            var displayShabDays = 0;
            if (shiftVal === 'חש') {
                displayShabDays = -1;
            } else if (shabbatMinutesCount >= 120) {
                displayShabDays = (shabbatMinutesCount / 60) / 8;
            }
            
            if (displayShabDays !== 0) { 
                shabbatHoursCell.innerHTML = displayShabDays < 0 ? `<span style="color:#e74c3c; display:block; text-align:left;" dir="ltr">${displayShabDays.toFixed(2)}</span>` : displayShabDays.toFixed(2);
                shabbatHoursCell.setAttribute('data-val', displayShabDays); 
            } else { 
                shabbatHoursCell.innerText = ''; 
                shabbatHoursCell.setAttribute('data-val', '0'); 
            }
        }

        var dailyCost = 0;
        columnsData.forEach(col2 => {
            var cell2 = document.getElementById('val-' + col2.id + '-' + rowId);
            if(cell2) {
                if (m[col2.id] > 0) {
                    var hours = m[col2.id] / 60; cell2.innerText = hours.toFixed(2); cell2.setAttribute('data-val', hours); dailyCost += (hours * col2.factor * rate);
                } else { cell2.innerText = ''; cell2.setAttribute('data-val', '0'); }
            }
        });
        if(costCell) { costCell.innerText = dailyCost > 0 ? dailyCost.toFixed(2) : ''; costCell.setAttribute('data-is-shift', '1'); costCell.setAttribute('data-cost', dailyCost); costCell.setAttribute('data-gross', physicalMinutes); }
        window.updateGrandTotal();
    } catch(e) { customAlert("שגיאה בחישוב השורה: " + e.message); }
};

window.updateGrandTotal = function() {
    var rate = parseFloat(document.getElementById('hourlyRate')?.value || 0);
    var totalDailyCostSum = 0, totalGrossMin = 0, totalShifts = 0, totalHoursOverall = 0, sumTotalShiftHours = 0, sumTotalShabbatDays = 0;
    var usedReg = 0, usedSick = 0, usedDec = 0, usedCho = 0, usedFam = 0, usedMil = 0, colTotals = {};
    columnsData.forEach(c => colTotals[c.id] = 0);

    var ym = getSelectedMonthYear(), carryOverShifts = window.carryOverData[ym.y + "-" + pad2(ym.m)] ? parseInt(window.carryOverData[ym.y + "-" + pad2(ym.m)], 10) : 0;
    var weekShiftsCount = {0: carryOverShifts}, weekIndex = 0;

    // תצוגה קבועה (לא רק בתוך אזהרת החריגה) של מספר המשמרות הנגררות מהחודש הקודם - נתון שנשמר בענן (carryOverData).
    var carryDisplayEl = document.getElementById('dashCarryOver');
    if (carryDisplayEl) carryDisplayEl.innerText = carryOverShifts > 0 ? ('כולל ' + carryOverShifts + ' נגררות') : '';

    for(var r=1; r<=31; r++) {
        var cell = document.getElementById('val-cost-' + r); if(!cell) continue;
        var dayOfW = new Date(ym.y, ym.m - 1, r).getDay();
        if (dayOfW === 0 && r > 1) weekIndex++; 
        
        var cellTH = document.getElementById('val-total-hours-' + r); if (cellTH) sumTotalShiftHours += parseFloat(cellTH.getAttribute('data-val') || 0);
        var cellSH = document.getElementById('val-shabbat-hours-' + r); if (cellSH) sumTotalShabbatDays += parseFloat(cellSH.getAttribute('data-val') || 0);

        var sVal = (document.querySelector('tr:nth-child(' + r + ') .shift-type-input')?.value || '').trim().replace(/"/g, '').replace(/'/g, '');
        if(sVal === 'ח') usedReg++; else if(sVal === 'מח') usedSick++; else if(sVal === 'הצ') usedDec++; else if(sVal === 'בח') usedCho++; else if(sVal === 'מבמ') usedFam++; else if(sVal === 'מיל') usedMil++;

        if (cell.getAttribute('data-is-shift') === '1' || window.ABSENCE_CODES.includes(sVal)) {
            if (!(sVal === 'מיל' && (dayOfW === 5 || dayOfW === 6))) {
                weekShiftsCount[weekIndex] = (weekShiftsCount[weekIndex] || 0) + 1;
            }
            
            if (cell.getAttribute('data-is-shift') === '1') {
                totalShifts++; totalDailyCostSum += parseFloat(cell.getAttribute('data-cost') || 0); totalGrossMin += parseInt(cell.getAttribute('data-gross') || 0, 10);
            }
            columnsData.forEach(col => {
                var cEl = document.getElementById('val-' + col.id + '-' + r); if(cEl) colTotals[col.id] += parseFloat(cEl.getAttribute('data-val') || 0);
            });
        }
    }
    
    var warnDiv = document.getElementById('weeklyWarning');
    if (warnDiv) {
        if (Object.values(weekShiftsCount).some(v => v > 5)) { warnDiv.style.display = 'block'; warnDiv.innerHTML = "⚠️ שים לב! חרגת ממכסת 5 משמרות בשבוע <br><span style='font-size:13px; font-weight:normal;'>(כולל " + carryOverShifts + " משמרות נגררות)</span>"; } 
        else warnDiv.style.display = 'none';
    }
    
    let shtEl = document.getElementById('sum-hours-totalShift'); if (shtEl) shtEl.innerText = sumTotalShiftHours > 0 ? sumTotalShiftHours.toFixed(2) : ''; 
    let shsEl = document.getElementById('sum-hours-shabbat'); if (shsEl) shsEl.innerHTML = sumTotalShabbatDays !== 0 ? (sumTotalShabbatDays < 0 ? `<span style="color:#e74c3c; display:block; text-align:left;" dir="ltr">${sumTotalShabbatDays.toFixed(2)}</span>` : sumTotalShabbatDays.toFixed(2)) : ''; 

    var tlushCost = 0;
    columnsData.forEach(colX => { 
        var cHours = colTotals[colX.id], cCost = cHours * colX.factor * rate;
        tlushCost += cCost; totalHoursOverall += cHours;
        let shc = document.getElementById('sum-hours-' + colX.id); if (shc) shc.innerText = cHours > 0 ? cHours.toFixed(2) : ''; 
        let scc = document.getElementById('sum-cost-' + colX.id); if (scc) scc.innerText = cCost > 0 ? cCost.toFixed(2) : ''; 
    });
    
    let sht = document.getElementById('sum-hours-total'); if(sht) sht.innerText = totalHoursOverall > 0 ? totalHoursOverall.toFixed(2) : '0.00'; 
    let sct = document.getElementById('sum-cost-total'); if(sct) sct.innerText = tlushCost > 0 ? tlushCost.toFixed(2) : '0.00'; 
    var eshelCost = Math.floor((totalGrossMin / 60) / 8) * (parseFloat(document.getElementById('eshelRate')?.value) || 0);
    
    let ds = document.getElementById('dashShifts'); if(ds) ds.innerText = totalShifts; 
    let dst = document.getElementById('dashStandard'); if(dst) dst.innerText = (colTotals['I'] || 0).toFixed(2);
    let dg = document.getElementById('dashGross'); if(dg) dg.innerText = (totalGrossMin / 60).toFixed(2); 
    let de = document.getElementById('dashEshel'); if(de) de.innerText = eshelCost.toFixed(2) + ' ₪';
    let tc = document.getElementById('tlushCost'); if(tc) tc.innerText = tlushCost.toFixed(2) + ' ₪';
    
    ['reg','shab','sick','dec','cho'].forEach(key => {
        let openEl = document.getElementById('bal_open_' + key);
        let openVal = parseFloat(openEl?.value || 0), usedVal = {'reg':usedReg,'shab':sumTotalShabbatDays,'sick':usedSick,'dec':usedDec,'cho':usedCho}[key];
        let displayUsed = (key==='shab' && usedVal>0 ? "+" : "") + (['dec','cho'].includes(key) ? usedVal : usedVal.toFixed(2));
        let closeVal = (key==='shab' ? (openVal + usedVal) : (openVal - usedVal)).toFixed(2);
        
        let uEl = document.getElementById('bal_used_' + key);
        if(uEl) { 
            if(key==='shab' && usedVal < 0) uEl.innerHTML = `<span style="color:#e74c3c; display:inline-block;" dir="ltr">${usedVal.toFixed(2)}</span>`; else uEl.innerText = displayUsed;
        }
        let cEl = document.getElementById('bal_close_' + key); if(cEl) cEl.innerText = closeVal;
        let tblOp = document.getElementById('tbl_bal_open_' + key); if(tblOp) tblOp.innerText = openVal.toFixed(2);
        let tblUs = document.getElementById('tbl_bal_used_' + key);
        if(tblUs) { 
            if(key==='shab' && usedVal < 0) tblUs.innerHTML = `<span style="color:#e74c3c; display:inline-block;" dir="ltr">${usedVal.toFixed(2)}</span>`; else tblUs.innerText = displayUsed;
        }
        let tblCl = document.getElementById('tbl_bal_close_' + key); if(tblCl) tblCl.innerText = closeVal;
    });

    let uf1 = document.getElementById('bal_used_fam'); if (uf1) uf1.innerText = usedFam.toFixed(2);
    let uf2 = document.getElementById('tbl_bal_used_fam'); if (uf2) uf2.innerText = usedFam.toFixed(2);
    let um1 = document.getElementById('bal_used_mil'); if (um1) um1.innerText = usedMil;
    let um2 = document.getElementById('tbl_bal_used_mil'); if (um2) um2.innerText = usedMil;

    let pds = document.getElementById('printDashShifts'); if(pds) pds.innerText = totalShifts; 
    let pdst = document.getElementById('printDashStandard'); if(pdst) pdst.innerText = (colTotals['I'] || 0).toFixed(2);
    let pdg = document.getElementById('printDashGross'); if(pdg) pdg.innerText = (totalGrossMin / 60).toFixed(2); 
    let pde = document.getElementById('printDashEshel'); if(pde) pde.innerText = eshelCost.toFixed(2) + ' ₪';
    let tcp = document.getElementById('tlushCostPrint'); if(tcp) tcp.innerText = tlushCost.toFixed(2) + ' ₪';
};

// עטיפה ל-updateGrandTotal: מאפשרת לדחות את הסיכום בזמן טעינת קובץ. הנוסחאות עצמן לא שונו.
(function() {
    var origUpdateGrandTotal = window.updateGrandTotal;
    window.__totalsBatchDepth = 0; window.__totalsPending = false;
    window.updateGrandTotal = function() {
        if (window.__totalsBatchDepth > 0) { window.__totalsPending = true; return; }
        return origUpdateGrandTotal.apply(this, arguments);
    };
    window.runTotalsBatch = function(fn) {
        window.__totalsBatchDepth++;
        try { fn(); } finally { window.__totalsBatchDepth--; }
        if (window.__totalsBatchDepth === 0 && window.__totalsPending) { window.__totalsPending = false; origUpdateGrandTotal(); }
    };
})();

