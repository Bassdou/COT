window.isBypassed = false;
let clickCount = 0;
let clickTimer;

// מנגנון ה-3 לחיצות שמעביר ישירות למערכת
window.secretBypass = function(e) {
    if(e) e.preventDefault();
    clickCount++;
    clearTimeout(clickTimer);
    
    // הבהוב על ידי שקיפות בגלל שלכל אות יש צבע משלה
    let titleEls = document.querySelectorAll('#authOverlay h2, #authOverlay .icon-logo');
    titleEls.forEach(el => {
        el.style.opacity = '0.5'; 
        setTimeout(() => { el.style.opacity = '1'; }, 150);
    });

    if(clickCount >= 3) {
        window.isBypassed = true;
        document.getElementById('authOverlay').style.display = 'none';
        
        // העלמת מסך שם במקרה והיה פתוח
        var nameOverlay = document.getElementById('updateNameOverlay');
        if(nameOverlay) nameOverlay.style.display = 'none';
        
        var btn = document.getElementById('logoutBtn');
        if(btn) btn.style.display = 'inline-block';
        clickCount = 0;
    }
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
};

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDzcW_tXO08BxmWki2Imx6sxq_4YKyxBLQ",
  authDomain: "cot2026.firebaseapp.com",
  projectId: "cot2026",
  storageBucket: "cot2026.firebasestorage.app",
  messagingSenderId: "187692524237",
  appId: "1:187692524237:web:6127236e55a6a763dc3f84"
};
firebase.initializeApp(firebaseConfig);

firebase.auth().onAuthStateChanged(function(user) {
    if (window.isBypassed) return; 
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        
        if (!user.displayName) {
            // למשתמשים ותיקים אין שם - נציג מסך השלמה
            document.getElementById('updateNameOverlay').style.display = 'flex';
            var btn = document.getElementById('logoutBtn');
            if(btn) btn.style.display = 'none';
        } else {
            // משתמש תקין
            var updateOverlay = document.getElementById('updateNameOverlay');
            if(updateOverlay) updateOverlay.style.display = 'none';
            
            var btn = document.getElementById('logoutBtn');
            if(btn) btn.style.display = 'inline-block';
            
            document.getElementById('employeeName').value = user.displayName;
            updateTitles();
        }
    } else {
        document.getElementById('authOverlay').style.display = 'flex';
        var updateOverlay = document.getElementById('updateNameOverlay');
        if(updateOverlay) updateOverlay.style.display = 'none';
        
        var btn = document.getElementById('logoutBtn');
        if(btn) btn.style.display = 'none';
    }
});

window.loginUser = function() {
    var email = document.getElementById('authEmail').value;
    var pass = document.getElementById('authPassword').value;
    var name = document.getElementById('authName').value.trim();
    document.getElementById('authError').innerText = "";
    
    firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(function(userCredential) {
        // אם המשתמש הזין שם במסך ההתחברות, נעדכן לו את הפרופיל כדי שיישמר לפעם הבאה
        if (name && userCredential.user.displayName !== name) {
            userCredential.user.updateProfile({ displayName: name }).then(() => {
                document.getElementById('employeeName').value = name;
                updateTitles();
            });
        }
    })
    .catch(function(error) {
        var msg = error.message;
        if(error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = 'אימייל או סיסמה שגויים.';
        if(error.code === 'auth/invalid-email') msg = 'כתובת אימייל לא חוקית.';
        document.getElementById('authError').innerText = "שגיאה: " + msg;
    });
};

window.registerUser = function() {
    var email = document.getElementById('authEmail').value;
    var pass = document.getElementById('authPassword').value;
    var name = document.getElementById('authName').value.trim();
    document.getElementById('authError').innerText = "";
    
    if(!name) {
        document.getElementById('authError').innerText = "אנא הזן שם עובד לפני ההרשמה.";
        return;
    }
    if(pass.length < 6) {
        document.getElementById('authError').innerText = "הסיסמה חייבת להכיל לפחות 6 תווים.";
        return;
    }
    
    firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then(function(userCredential) {
        return userCredential.user.updateProfile({
            displayName: name
        }).then(function() {
            document.getElementById('employeeName').value = name;
            updateTitles();
        });
    })
    .catch(function(error) {
        var msg = error.message;
        if(error.code === 'auth/email-already-in-use') msg = 'האימייל כבר קיים במערכת, נסה להתחבר.';
        if(error.code === 'auth/invalid-email') msg = 'כתובת אימייל לא חוקית.';
        document.getElementById('authError').innerText = "שגיאה: " + msg;
    });
};

window.saveMissingName = function() {
    var name = document.getElementById('missingNameInput').value.trim();
    var errorDiv = document.getElementById('missingNameError');
    errorDiv.innerText = "";
    
    if(!name) {
        errorDiv.innerText = "נא להזין שם כדי להמשיך.";
        return;
    }
    
    var user = firebase.auth().currentUser;
    if(user) {
        user.updateProfile({
            displayName: name
        }).then(function() {
            document.getElementById('updateNameOverlay').style.display = 'none';
            var btn = document.getElementById('logoutBtn');
            if(btn) btn.style.display = 'inline-block';
            
            document.getElementById('employeeName').value = name;
            updateTitles();
        }).catch(function(error) {
            errorDiv.innerText = "שגיאה בעדכון השם: " + error.message;
        });
    }
};

window.logoutUser = function() {
    window.isBypassed = false;
    firebase.auth().signOut();
};

var daysHebrew = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
var columnsData = [
    { id: 'I', factor: 0.0 }, { id: 'J', factor: 1.0 }, { id: 'K', factor: 1.25 }, { id: 'L', factor: 1.5 }, 
    { id: 'M', factor: 1.75 }, { id: 'N', factor: 2.0 }, { id: 'O', factor: 1.8 }, { id: 'P', factor: 1.875 }, 
    { id: 'Q', factor: 2.25 }, { id: 'R', factor: 2.5 }, { id: 'S', factor: 0.2 }, { id: 'T', factor: 0.5 }, 
    { id: 'U', factor: 0.75 }, { id: 'V', factor: 0.875 }, { id: 'W', factor: 1.0 }
];

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function getFormattedFileName() {
    var empName = document.getElementById('employeeName').value.trim();
    var mSelect = document.getElementById('monthSelect');
    var monthVal = pad2(parseInt(mSelect.value, 10));
    var yearVal = document.getElementById('yearInput').value;

    var cleanName = empName.replace(/\s+/g, '_');
    if (!cleanName) { cleanName = "נתוני_משמרות"; }

    return cleanName + "_" + monthVal + "_" + yearVal;
}

function updateTitles() {
    var mSelect = document.getElementById('monthSelect');
    var monthNameParts = mSelect.options[mSelect.selectedIndex].text.split('-');
    var monthNameClean = monthNameParts.length > 1 ? monthNameParts[1].trim() : monthNameParts[0];
    var year = document.getElementById('yearInput').value;
    var empName = document.getElementById('employeeName').value.trim();

    document.getElementById('printMonthYearText').innerText = monthNameClean + " " + year;
    
    var sheetTitle = document.getElementById('sheetTitle');
    var printEmpDisplay = document.getElementById('printEmployeeNameDisplay');
    
    var baseTitleStr = "דוח שעות משמרות - " + monthNameClean + " " + year;
    
    if (empName !== "") {
        sheetTitle.innerText = baseTitleStr + " | עובד: " + empName;
        printEmpDisplay.innerText = "| עובד: " + empName;
        printEmpDisplay.style.display = "inline-block";
    } else {
        sheetTitle.innerText = baseTitleStr;
        printEmpDisplay.style.display = "none";
    }
    
    document.title = getFormattedFileName();
}

window.openMiniShiftInfo = function() {
    document.getElementById('miniShiftInfoModal').style.display = "block";
};

window.closeMiniShiftInfo = function() {
    document.getElementById('miniShiftInfoModal').style.display = "none";
};

window.openShiftInfo = function() {
    document.getElementById('shiftInfoModal').style.display = "block";
};

window.closeShiftInfo = function() {
    document.getElementById('shiftInfoModal').style.display = "none";
};

window.onclick = function(event) {
    var modal = document.getElementById('shiftInfoModal');
    var miniModal = document.getElementById('miniShiftInfoModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
    if (event.target == miniModal) {
        miniModal.style.display = "none";
    }
};

window.formatTimeInput = function(input) {
    var originalVal = input.value.trim();
    if (originalVal === '') {
        input.value = '';
        calculateRow(input);
        return;
    }
    
    var val = originalVal.replace(/[^\d]/g, '');
    
    if (val === '') {
        input.value = '';
    } else if (val.length === 1 || val.length === 2) {
        var h = parseInt(val, 10);
        if (h > 23) h = 23;
        input.value = pad2(h) + ':00';
    } else if (val.length === 3) {
        var h = parseInt(val.substring(0, 1), 10);
        var m = parseInt(val.substring(1, 3), 10);
        if (m > 59) m = 59;
        input.value = '0' + h + ':' + pad2(m);
    } else if (val.length >= 4) {
        var h = parseInt(val.substring(0, 2), 10);
        var m = parseInt(val.substring(2, 4), 10);
        if (h > 23) h = 23;
        if (m > 59) m = 59;
        input.value = pad2(h) + ':' + pad2(m);
    }
    
    calculateRow(input);
};

window.loadData = function() {
    var fileInput = document.getElementById('fileLoader');
    if (fileInput) {
        fileInput.click();
    } else {
        alert("שגיאה: כפתור טעינת הקובץ לא הוגדר כראוי.");
    }
};

window.saveData = async function() {
    var monthVal = document.getElementById('monthSelect').value;
    var yearVal = document.getElementById('yearInput').value;
    
    var data = {
        month: monthVal,
        year: yearVal,
        hourlyRate: document.getElementById('hourlyRate').value,
        eshelRate: document.getElementById('eshelRate').value,
        shabbatBalance: document.getElementById('shabbatBalance').value,
        employeeName: document.getElementById('employeeName').value,
        shifts: []
    };
    
    var tbody = document.getElementById('tbody');
    if (tbody) {
        var rows = tbody.querySelectorAll('tr:not(.tfoot-summary)');
        rows.forEach(function(tr) {
            var shiftInput = tr.querySelector('.shift-type-input');
            var timeInputs = tr.querySelectorAll('.time-input');
            if (shiftInput && timeInputs.length >= 2) {
                data.shifts.push({
                    shiftType: shiftInput.value,
                    start: timeInputs[0].value,
                    end: timeInputs[1].value
                });
            }
        });
    }

    var jsonString = JSON.stringify(data);
    var filename = getFormattedFileName() + ".json";

    try {
        if (window.showSaveFilePicker) {
            const opts = {
                suggestedName: filename,
                types: [{
                    description: 'JSON File',
                    accept: {'application/json': ['.json']},
                }],
            };
            const handle = await window.showSaveFilePicker(opts);
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        } else {
            var blob = new Blob([jsonString], {type: "application/json"});
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            alert("שגיאה בשמירת הקובץ.");
        }
    }
};

window.handleFileLoad = function(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            
            if (data.month) document.getElementById('monthSelect').value = data.month;
            if (data.year) document.getElementById('yearInput').value = data.year;
            if (data.hourlyRate) document.getElementById('hourlyRate').value = data.hourlyRate;
            if (data.eshelRate) document.getElementById('eshelRate').value = data.eshelRate;
            if (data.shabbatBalance !== undefined) document.getElementById('shabbatBalance').value = data.shabbatBalance;
            if (data.employeeName !== undefined) document.getElementById('employeeName').value = data.employeeName;

            updateTitles();
            generateTable(); 

            var tbody = document.getElementById('tbody');
            var rows = tbody.querySelectorAll('tr');
            
            for (var i = 0; i < rows.length && i < data.shifts.length; i++) {
                var tr = rows[i];
                if(!tr) continue;
                var shiftInput = tr.querySelector('.shift-type-input');
                var timeInputs = tr.querySelectorAll('.time-input');
                
                if (shiftInput) shiftInput.value = data.shifts[i].shiftType || '';
                if (timeInputs.length >= 2) {
                    timeInputs[0].value = data.shifts[i].start || '';
                    timeInputs[1].value = data.shifts[i].end || '';
                    calculateRow(timeInputs[0]); 
                }
            }
            
            event.target.value = '';
            alert('הנתונים נטענו בהצלחה!');
        } catch(err) {
            alert("שגיאה בטעינת הקובץ.");
        }
    };
    reader.readAsText(file);
};

window.generateTable = function() {
    try {
        var month = parseInt(document.getElementById('monthSelect').value, 10);
        var year = parseInt(document.getElementById('yearInput').value, 10);
        if (!year || isNaN(year)) { return; }

        updateTitles();

        var daysInMonth = new Date(year, month, 0).getDate();
        var tbody = document.getElementById('tbody');
        var htmlContent = '';
        
        for (var i = 1; i <= daysInMonth; i++) {
            var dateObj = new Date(year, month - 1, i);
            var dayNum = dateObj.getDay(); 
            var dateStr = pad2(i); 
            
            var rowSatClass = (dayNum === 6) ? "row-sat" : "";
            var dayClass = (dayNum === 5) ? "day-fri" : (dayNum === 6) ? "day-sat" : "";

            htmlContent += '<tr class="' + rowSatClass + '">' +
                '<td class="'+dayClass+'" style="width: 30px; min-width: 30px; max-width: 35px;">' + dateStr + '</td>' +
                '<td class="'+dayClass+' col-sep" style="width: 30px; min-width: 30px; max-width: 35px;">' + daysHebrew[dayNum] + '</td>' +
                '<td class="'+dayClass+' col-sep hide-print"><input type="text" class="shift-type-input" maxlength="3" style="width: 35px; padding: 2px;" onkeyup="handleShiftType(this)" onchange="handleShiftType(this)" oninput="handleShiftType(this)"></td>' +
                '<td class="'+dayClass+' print-thick-right"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)" data-date="'+year+'-'+month+'-'+i+'"></td>' +
                '<td class="col-sep '+dayClass+'"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)"></td>' +
                '<td class="'+dayClass+' col-sep" id="val-desc-'+i+'" style="font-size: 12px; font-weight: bold; color: #1565c0; background-color: #f8fbff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-total-hours-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+'" id="val-shabbat-hours-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-I-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-J-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-K-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-L-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-M-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+' thick-border-left" id="val-N-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-O-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-P-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-Q-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-R-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-S-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-T-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-U-'+i+'" data-val="0"></td>' +
                '<td class="val-cell '+dayClass+'" id="val-V-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-W-'+i+'" data-val="0"></td>' +
                '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-cost-'+i+'" data-is-shift="0" data-cost="0" data-gross="0" data-shabbat="0" data-isholiday="0" data-isregholiday="0"></td>' +
            '</tr>';
        }
        tbody.innerHTML = htmlContent;
        document.getElementById('tableContainer').style.display = 'block';
        document.getElementById('summaryPanel').style.display = 'block';
        document.getElementById('printBtn').style.display = 'inline-block';
        updateGrandTotal();
    } catch (error) {
        console.error("שגיאה ביצירת הטבלה: ", error);
    }
};

window.handleShiftType = function(input) {
    var val = input.value.trim().replace(/"/g, '').replace(/'/g, ''); 
    var tr = input;
    while (tr && tr.tagName !== 'TR') { tr = tr.parentNode; }
    if (!tr) return;

    var timeInputs = tr.querySelectorAll('.time-input');
    if (!timeInputs || timeInputs.length < 2) return;

    var shifts = {
        'ב': ['07:00', '19:00'],
        'ל': ['19:00', '07:00'],
        '615': ['06:00', '15:00'],
        '616': ['07:00', '16:00'],
        '617': ['08:00', '17:00'],
        'ב06': ['07:00', '18:00'],
        'ב16': ['08:00', '16:00'],
        '102': ['10:00', '20:00'],
        '111': ['11:00', '20:00'],
        '112': ['12:00', '22:15'],
        '132': ['13:00', '23:15'],
        '207': ['20:00', '07:00'],
        '217': ['21:00', '07:00'],
        '227': ['22:00', '07:00'],
        '228': ['22:00', '08:00']
    };

    if (shifts[val]) {
        timeInputs[0].value = shifts[val][0];
        timeInputs[1].value = shifts[val][1];
        timeInputs[0].classList.remove('empty-print');
        timeInputs[1].classList.remove('empty-print');
    } else if (['ח', 'חש', 'מח', 'הס', 'בח', 'מבמ', 'הכ'].includes(val) || val === '') {
        timeInputs[0].value = '';
        timeInputs[1].value = '';
        timeInputs[0].classList.add('empty-print');
        timeInputs[1].classList.add('empty-print');
    }
    
    calculateRow(timeInputs[0]);
};

window.calculateRow = function(inputElem) {
    try {
        var tr = inputElem;
        while (tr && tr.tagName !== 'TR') { tr = tr.parentNode; }
        
        var timeInputs = tr.querySelectorAll('.time-input');
        var startInput = timeInputs[0].value;
        var endInput = timeInputs[1].value;
        
        if (startInput) { timeInputs[0].classList.remove('empty-print'); } else { timeInputs[0].classList.add('empty-print'); }
        if (endInput) { timeInputs[1].classList.remove('empty-print'); } else { timeInputs[1].classList.add('empty-print'); }

        var dateString = timeInputs[0].getAttribute('data-date');
        var rowId = dateString.split('-')[2]; 
        var costCell = document.getElementById('val-cost-' + rowId);
        var totalHoursCell = document.getElementById('val-total-hours-' + rowId);
        var shabbatHoursCell = document.getElementById('val-shabbat-hours-' + rowId);
        
        var shiftInput = tr.querySelector('.shift-type-input');
        var shiftVal = shiftInput ? shiftInput.value.trim().replace(/"/g, '').replace(/'/g, '') : '';
        var isRegHol = ['ח', 'מח', 'הס', 'בח', 'מבמ', 'הכ'].includes(shiftVal);
        var isShabHol = (shiftVal === 'חש');

        var descCell = document.getElementById('val-desc-' + rowId);
        if (descCell) {
            var descMap = { 
                'ב': 'נוכחות', 'ל': 'נוכחות', '615': 'נוכחות', '616': 'נוכחות', '617': 'נוכחות', 
                'ב06': 'נוכחות', 'ב16': 'נוכחות', '102': 'נוכחות', '111': 'נוכחות', '112': 'נוכחות', 
                '132': 'נוכחות', '207': 'נוכחות', '217': 'נוכחות', '227': 'נוכחות', '228': 'נוכחות', 
                'ח': 'חופש', 'חש': 'חופש שבת', 'מח': 'מחלה', 'הס': 'עפ"י הסכם', 'בח': 'בחירה', 
                'מבמ': 'מחלת בן משפחה', 'הכ': 'הכשרה' 
            };
            if (shiftVal && descMap[shiftVal]) {
                descCell.innerText = descMap[shiftVal];
            } else if (startInput && endInput) {
                descCell.innerText = 'נוכחות';
            } else {
                descCell.innerText = '';
            }
        }

        if (!startInput || !endInput || startInput.indexOf(':') === -1 || endInput.indexOf(':') === -1) {
            if (totalHoursCell) { totalHoursCell.innerText = ''; totalHoursCell.setAttribute('data-val', '0'); }
            if (shabbatHoursCell) {
                if (isShabHol) { shabbatHoursCell.innerText = '-1.00'; shabbatHoursCell.setAttribute('data-val', '-1'); } 
                else { shabbatHoursCell.innerText = ''; shabbatHoursCell.setAttribute('data-val', '0'); }
            }
            
            for(var c = 0; c < columnsData.length; c++) {
                var cell1 = document.getElementById('val-' + columnsData[c].id + '-' + rowId);
                if(cell1) { 
                    if (columnsData[c].id === 'I' && (isRegHol || isShabHol)) { cell1.innerText = '8.00'; cell1.setAttribute('data-val', '8'); } 
                    else { cell1.innerText = ''; cell1.setAttribute('data-val', '0'); }
                }
            }
            if(costCell) { costCell.innerText = ''; costCell.setAttribute('data-is-shift', '0'); costCell.setAttribute('data-cost', '0'); costCell.setAttribute('data-gross', '0'); costCell.setAttribute('data-shabbat', '0'); }
            updateGrandTotal(); return;
        }

        var rate = parseFloat(document.getElementById('hourlyRate').value) || 0;
        var parts = dateString.split('-');
        var shiftMonth = parseInt(parts[1], 10);
        var shiftDate = new Date(parts[0], shiftMonth-1, parts[2]);
        var baseDay = shiftDate.getDay() + 1; 

        var startParts = startInput.split(':'), endParts = endInput.split(':');
        var startH = parseInt(startParts[0], 10), startM = parseInt(startParts[1], 10);
        var endH = parseInt(endParts[0], 10), endM = parseInt(endParts[1], 10);

        var dStart = startH + startM / 60, dEnd = endH + endM / 60;
        if (dEnd <= dStart) dEnd += 24;

        var totalMinutes = Math.round((dEnd - dStart) * 60);
        
        if (totalHoursCell) {
            var displayHours = (totalMinutes / 60);
            if (displayHours > 0) { totalHoursCell.innerText = displayHours.toFixed(2); totalHoursCell.setAttribute('data-val', displayHours); } 
            else { totalHoursCell.innerText = ''; totalHoursCell.setAttribute('data-val', '0'); }
        }

        var shabbatStartHour = (shiftMonth >= 4 && shiftMonth <= 9) ? 18 : 17;
        
        var nightMinutesCount = 0;
        var afternoonMinutesCount = 0; 
        for (var i = 1; i <= totalMinutes; i++) {
            var cHourDec = (dStart + (i - 0.5) / 60) % 24;
            if (cHourDec >= 22 || cHourDec < 6) nightMinutesCount++;
            if (cHourDec >= 14 && cHourDec < 22) afternoonMinutesCount++; 
        }
        var isNightShift = nightMinutesCount >= 120;
        
        var startHourDec = startH + startM / 60;
        var qualifiesForAfternoon = true;
        if (startHourDec < 14 && afternoonMinutesCount < 180) {
            qualifiesForAfternoon = false;
        }
        
        var enteredBefore3 = (startHourDec >= 12 || startHourDec <= 3.0);

        var ot1_Minutes = 8 * 60, ot2_Minutes = 10 * 60;
        if (baseDay === 6) { ot1_Minutes = 6.5 * 60; ot2_Minutes = 8.5 * 60; } else if (isNightShift) { ot1_Minutes = 7 * 60; ot2_Minutes = 9 * 60; }

        var m = { I:0, J:0, K:0, L:0, M:0, N:0, O:0, P:0, Q:0, R:0, S:0, T:0, U:0, V:0, W:0 };
        var shabbatMinutesCount = 0;

        for (var j = 1; j <= totalMinutes; j++) {
            var absH = dStart + (j - 0.5) / 60;
            var cDayNum2 = ((baseDay - 1 + Math.floor(absH / 24)) % 7) + 1;
            var cHourDec2 = absH % 24;
            
            var isShab = false;
            if (cDayNum2 === 6 && cHourDec2 >= shabbatStartHour) { isShab = true; } 
            else if (cDayNum2 === 7) { isShab = true; } 
            else if (cDayNum2 === 1 && cHourDec2 < 6) { isShab = true; }

            var isNight = (cHourDec2 >= 22 || cHourDec2 < 6);
            
            if (isNightShift && enteredBefore3) {
                var morning6AM = (startH < 6) ? 6 : 30; 
                if (absH >= morning6AM) {
                    isNight = true; 
                }
            }

            if (isShab) { shabbatMinutesCount++; }
            
            var payMult = 1.0;
            if (isShab) payMult = isNight ? 2.0 : 1.75; 
            else if (isNight) payMult = 1.5; 
            else if (cHourDec2 >= 14 && cHourDec2 < 22 && qualifiesForAfternoon) payMult = 1.2;
            
            var otMult = 1.0; 
            if (j > ot2_Minutes) otMult = 1.5; 
            else if (j > ot1_Minutes) otMult = 1.25;

            var fMult = Math.round((isShab ? payMult + (otMult - 1) : payMult * otMult) * 1000) / 1000;
            
            if (otMult === 1.0) {
                if (isShab) {
                    m.I++; 
                    if (payMult === 1.75) m.U++; else if (payMult === 2.0) m.W++; 
                } else {
                    m.I++; 
                    if (payMult === 1.2) m.S++; else if (payMult === 1.5) m.T++; 
                }
            } else {
                if (fMult === 1.25) m.K++; 
                else if (fMult === 1.5) m.L++; 
                else if (fMult === 1.75) m.M++;
                else if (fMult === 1.8) m.O++; 
                else if (fMult === 1.875) m.P++; 
                else if (fMult === 2.0) m.N++; 
                else if (fMult === 2.25) m.Q++; 
                else if (fMult === 2.5) m.R++; 
                else { if (!isShab && otMult === 1.25) m.K++; else m.J++; }
            }
        }

        if (isRegHol || isShabHol) { m.I += 480; }

        if (shabbatHoursCell) {
            var displayShabDays = (shabbatMinutesCount / 60) / 8;
            if (isShabHol) displayShabDays -= 1; 

            if (displayShabDays !== 0) { shabbatHoursCell.innerText = displayShabDays.toFixed(2); shabbatHoursCell.setAttribute('data-val', displayShabDays); } 
            else { shabbatHoursCell.innerText = ''; shabbatHoursCell.setAttribute('data-val', '0'); }
        }

        var dailyCost = 0;
        for(var idx = 0; idx < columnsData.length; idx++) {
            var col2 = columnsData[idx];
            var cell2 = document.getElementById('val-' + col2.id + '-' + rowId);
            if(cell2) {
                if (m[col2.id] > 0) {
                    var hours = m[col2.id] / 60;
                    cell2.innerText = hours.toFixed(2); cell2.setAttribute('data-val', hours);
                    dailyCost += (hours * col2.factor * rate);
                } else { cell2.innerText = ''; cell2.setAttribute('data-val', '0'); }
            }
        }
        if(costCell) {
            costCell.innerText = dailyCost > 0 ? dailyCost.toFixed(2) : '';
            costCell.setAttribute('data-is-shift', '1'); 
            costCell.setAttribute('data-cost', dailyCost);
            costCell.setAttribute('data-gross', totalMinutes); 
        }
        window.updateGrandTotal();
    } catch(e) { alert("שגיאה בחישוב השורה: " + e.message); }
};

window.updateGrandTotal = function() {
    var rate = parseFloat(document.getElementById('hourlyRate').value) || 0;
    var totalDailyCostSum = 0, totalGrossMin = 0, totalShifts = 0;
    var totalHoursOverall = 0, sumTotalShiftHours = 0, sumTotalShabbatDays = 0;
    var deductedShabbatDays = 0; 
    
    var colTotals = {};
    for(var c=0; c<columnsData.length; c++) { colTotals[columnsData[c].id] = 0; }

    for(var r=1; r<=31; r++) {
        var cell = document.getElementById('val-cost-' + r);
        if(!cell) continue;

        var cellTH = document.getElementById('val-total-hours-' + r);
        if (cellTH) sumTotalShiftHours += parseFloat(cellTH.getAttribute('data-val') || 0);
        
        var cellSH = document.getElementById('val-shabbat-hours-' + r);
        if (cellSH) sumTotalShabbatDays += parseFloat(cellSH.getAttribute('data-val') || 0);

        var shiftInput = document.querySelector('tr:nth-child(' + r + ') .shift-type-input');
        var shiftVal = shiftInput ? shiftInput.value.trim().replace(/"/g, '').replace(/'/g, '') : '';
        var isShabHoliday = (shiftVal === 'חש');
        var isRegHoliday = ['ח', 'מח', 'הס', 'בח', 'מבמ', 'הכ'].includes(shiftVal);
        var hasShift = cell.getAttribute('data-is-shift') === '1';

        if (isShabHoliday) {
            deductedShabbatDays += 1; 
        }

        if (hasShift || isShabHoliday || isRegHoliday) {
            if (hasShift) {
                totalShifts++;
                totalDailyCostSum += parseFloat(cell.getAttribute('data-cost') || 0);
                totalGrossMin += parseInt(cell.getAttribute('data-gross') || 0, 10);
            }
            for(var i=0; i<columnsData.length; i++) {
                var cellValElem = document.getElementById('val-' + columnsData[i].id + '-' + r);
                if(cellValElem) colTotals[columnsData[i].id] += parseFloat(cellValElem.getAttribute('data-val') || 0);
            }
        }
    }
    
    var sumHoursTotalShiftCell = document.getElementById('sum-hours-totalShift');
    if (sumHoursTotalShiftCell) sumHoursTotalShiftCell.innerText = sumTotalShiftHours > 0 ? sumTotalShiftHours.toFixed(2) : ''; 

    var sumHoursShabbatCell = document.getElementById('sum-hours-shabbat');
    if (sumHoursShabbatCell) sumHoursShabbatCell.innerText = sumTotalShabbatDays !== 0 ? sumTotalShabbatDays.toFixed(2) : ''; 

    var tlushCost = 0;
    for(var k=0; k<columnsData.length; k++) { 
        var colX = columnsData[k];
        var colHours = colTotals[colX.id];
        var colCost = colHours * colX.factor * rate;
        tlushCost += colCost;
        totalHoursOverall += colHours;
        
        var sumHoursCell = document.getElementById('sum-hours-' + colX.id);
        if (sumHoursCell) sumHoursCell.innerText = colHours > 0 ? colHours.toFixed(2) : ''; 

        var sumCostCell = document.getElementById('sum-cost-' + colX.id);
        if (sumCostCell) sumCostCell.innerText = colCost > 0 ? colCost.toFixed(2) : ''; 
    }
    
    var sumHoursTotalCell = document.getElementById('sum-hours-total');
    if (sumHoursTotalCell) sumHoursTotalCell.innerText = totalHoursOverall > 0 ? totalHoursOverall.toFixed(2) : '0.00'; 

    var sumTotalCell = document.getElementById('sum-cost-total');
    if (sumTotalCell) sumTotalCell.innerText = tlushCost > 0 ? tlushCost.toFixed(2) : '0.00'; 
    
    var eshelRate = parseFloat(document.getElementById('eshelRate').value) || 0;
    var eshelCost = Math.floor((totalGrossMin / 60) / 8) * eshelRate;
    
    var prevShabbatBalance = parseFloat(document.getElementById('shabbatBalance').value) || 0;
    var earnedShabbatDays = sumTotalShabbatDays + deductedShabbatDays; 
    var finalShabbatTotal = prevShabbatBalance + sumTotalShabbatDays; 
    
    var totalStandardHours = colTotals['I'] || 0;

    document.getElementById('dashShifts').innerText = totalShifts;
    document.getElementById('dashStandard').innerText = totalStandardHours.toFixed(2);
    document.getElementById('dashGross').innerText = (totalGrossMin / 60).toFixed(2);
    document.getElementById('dashEshel').innerText = eshelCost.toFixed(2) + ' ₪';
    
    if(document.getElementById('dashShabbatPrev')) document.getElementById('dashShabbatPrev').innerText = prevShabbatBalance.toFixed(2);
    if(document.getElementById('dashShabbatEarned')) document.getElementById('dashShabbatEarned').innerText = earnedShabbatDays.toFixed(2);
    if(document.getElementById('dashShabbatDeducted')) document.getElementById('dashShabbatDeducted').innerText = deductedShabbatDays.toFixed(2);
    if(document.getElementById('dashShabbatTotal')) document.getElementById('dashShabbatTotal').innerText = finalShabbatTotal.toFixed(2);

    document.getElementById('tlushCost').innerText = tlushCost.toFixed(2) + ' ₪';
    
    if(document.getElementById('printDashShifts')) document.getElementById('printDashShifts').innerText = totalShifts;
    if(document.getElementById('printDashStandard')) document.getElementById('printDashStandard').innerText = totalStandardHours.toFixed(2) + " ש'";
    if(document.getElementById('printDashGross')) document.getElementById('printDashGross').innerText = (totalGrossMin / 60).toFixed(2) + " ש'";
    if(document.getElementById('printDashEshel')) document.getElementById('printDashEshel').innerText = eshelCost.toFixed(2) + ' ₪';
    
    if(document.getElementById('printDashShabbatPrev')) document.getElementById('printDashShabbatPrev').innerText = prevShabbatBalance.toFixed(2);
    if(document.getElementById('printDashShabbatEarned')) document.getElementById('printDashShabbatEarned').innerText = earnedShabbatDays.toFixed(2);
    if(document.getElementById('printDashShabbatDeducted')) document.getElementById('printDashShabbatDeducted').innerText = deductedShabbatDays.toFixed(2);
    if(document.getElementById('printDashShabbatTotal')) document.getElementById('printDashShabbatTotal').innerText = finalShabbatTotal.toFixed(2);

    if(document.getElementById('tlushCostPrint')) document.getElementById('tlushCostPrint').innerText = tlushCost.toFixed(2) + ' ₪';
};

document.addEventListener('keydown', function(e) {
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        var el = e.target;
        if (el.tagName === 'INPUT' && (el.classList.contains('shift-type-input') || el.classList.contains('time-input'))) {
            if (el.classList.contains('time-input') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                return; 
            }
            var tbody = document.getElementById('tbody');
            var tr = el.closest('tr');
            if (!tr) return;
            var inputsInRow = Array.from(tr.querySelectorAll('input.shift-type-input, input.time-input'));
            var inputIndex = inputsInRow.indexOf(el);
            var targetInput = null;

            if (e.key === 'ArrowDown') {
                var targetTr = tr.nextElementSibling;
                if (targetTr) {
                    var targetInputs = Array.from(targetTr.querySelectorAll('input.shift-type-input, input.time-input'));
                    if (targetInputs[inputIndex]) targetInput = targetInputs[inputIndex];
                }
            } else if (e.key === 'ArrowUp') {
                var targetTr = tr.previousElementSibling;
                if (targetTr) {
                    var targetInputs = Array.from(targetTr.querySelectorAll('input.shift-type-input, input.time-input'));
                    if (targetInputs[inputIndex]) targetInput = targetInputs[inputIndex];
                }
            } else if (e.key === 'ArrowLeft') {
                if (inputIndex < inputsInRow.length - 1) { targetInput = inputsInRow[inputIndex + 1]; } 
                else {
                    var nextTr = tr.nextElementSibling;
                    if (nextTr) {
                        var nextInputs = Array.from(nextTr.querySelectorAll('input.shift-type-input, input.time-input'));
                        if (nextInputs.length > 0) targetInput = nextInputs[0];
                    }
                }
            } else if (e.key === 'ArrowRight') {
                if (inputIndex > 0) { targetInput = inputsInRow[inputIndex - 1]; } 
                else {
                    var prevTr = tr.previousElementSibling;
                    if (prevTr) {
                        var prevInputs = Array.from(prevTr.querySelectorAll('input.shift-type-input, input.time-input'));
                        if (prevInputs.length > 0) targetInput = prevInputs[prevInputs.length - 1];
                    }
                }
            }
            if (targetInput) {
                e.preventDefault(); 
                targetInput.focus();
                if(targetInput.type === 'text') targetInput.select();
            }
        }
    }
});

window.clearData = function() {
    document.getElementById('employeeName').value = "";
    document.getElementById('hourlyRate').value = "0.00";
    document.getElementById('eshelRate').value = "52.66";
    document.getElementById('shabbatBalance').value = "0.00";
    
    var now = new Date();
    var prevMonth = now.getMonth(); 
    var calcYear = now.getFullYear();
    if (prevMonth === 0) { prevMonth = 12; calcYear--; }
    document.getElementById('yearInput').value = calcYear;
    document.getElementById('monthSelect').value = prevMonth;
    
    var tbody = document.getElementById('tbody');
    if (tbody) tbody.innerHTML = '';
    
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('summaryPanel').style.display = 'none';
    document.getElementById('printBtn').style.display = 'none';
    
    updateTitles();
};

window.onload = function() {
    try {
        clearData();
    } catch(e) {
        console.error("שגיאה באתחול ראשוני: ", e);
    }
};

</script>