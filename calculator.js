// קובץ מנוע חישוב: calculator.js

window.carryOverData = {};
const MINIMUM_ESHEL_RATE = 52.66; 

// ==========================================
// מנגנון חלונות קופצים חכמים - COT says
// ==========================================
window.customDialog = function(type, msg, title = "COT says") {
    return new Promise((resolve) => {
        let modal = document.getElementById('customDialogModal');
        let titleEl = document.getElementById('customDialogTitle');
        let msgEl = document.getElementById('customDialogMessage');
        let inputEl = document.getElementById('customDialogInput');
        let okBtn = document.getElementById('customDialogOkBtn');
        let cancelBtn = document.getElementById('customDialogCancelBtn');
        
        titleEl.innerText = title;
        msgEl.innerHTML = msg;
        inputEl.value = '';
        
        if (type === 'alert') {
            inputEl.style.display = 'none';
            cancelBtn.style.display = 'none';
        } else if (type === 'confirm') {
            inputEl.style.display = 'none';
            cancelBtn.style.display = 'inline-block';
        } else if (type === 'prompt') {
            inputEl.style.display = 'block';
            cancelBtn.style.display = 'inline-block';
            setTimeout(() => inputEl.focus(), 100);
        }
        
        modal.style.display = 'block';
        
        // ניקוי אירועי לחיצה ישנים
        let newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        let newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newOkBtn.onclick = function() {
            modal.style.display = 'none';
            if (type === 'prompt') resolve(inputEl.value);
            else resolve(true);
        };
        
        newCancelBtn.onclick = function() {
            modal.style.display = 'none';
            if (type === 'prompt') resolve(null);
            else resolve(false);
        };

        if(type === 'prompt') {
            inputEl.onkeydown = function(e) {
                if (e.key === 'Enter') { e.preventDefault(); newOkBtn.click(); }
            };
        }
    });
};

window.customAlert = (msg) => customDialog('alert', msg);
window.customConfirm = (msg) => customDialog('confirm', msg);
window.customPrompt = (msg) => customDialog('prompt', msg);


// --- כניסה סמויה ומאובטחת ---
window.isBypassed = false;
let clickCount = 0;
let clickTimer;

window.secretBypass = async function(e) {
    if(e) e.preventDefault();
    clickCount++;
    clearTimeout(clickTimer);
    
    if(clickCount >= 3) {
        clickCount = 0; 
        
        let now = new Date();
        let dd = String(now.getDate()).padStart(2, '0');
        let mm = String(now.getMonth() + 1).padStart(2, '0');
        let yy = String(now.getFullYear()).slice(-2);
        let dateInt = parseInt(dd + mm + yy, 10);
        let expectedPass = String(999999 - dateInt); 
        
        let pwd = await customPrompt("הזן קוד אבטחה:");
        if (pwd === expectedPass) {
            window.isBypassed = true;
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'inline-block';
            document.getElementById('employeeName').value = 'בדיקות';
            initMonthYearSelect();
            updateTitles();
        } else if (pwd !== null) {
            customAlert("קוד שגוי.");
        }
    } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    }
};

// --- Firebase Configuration & Auth ---
const firebaseConfig = {
    apiKey: "AIzaSyDzcW_tXO08BxmWki2Imx6sxq_4YKyxBLQ",
    authDomain: "cot2026.firebaseapp.com",
    projectId: "cot2026",
    storageBucket: "cot2026.firebasestorage.app",
    messagingSenderId: "187692524237",
    appId: "1:187692524237:web:6127236e55a6a763dc3f84"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

firebase.auth().onAuthStateChanged(function(user) {
    if (window.isBypassed) return; 
    if (user) {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        initMonthYearSelect();
        
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                let d = doc.data();
                if(d.employeeName) document.getElementById('employeeName').value = d.employeeName;
                if(d.hourlyRate) document.getElementById('hourlyRate').value = d.hourlyRate;
                if(d.eshelRate) document.getElementById('eshelRate').value = d.eshelRate;
                
                if(d.bal_open_reg) document.getElementById('bal_open_reg').value = parseFloat(d.bal_open_reg).toFixed(2);
                if(d.bal_open_shab) document.getElementById('bal_open_shab').value = parseFloat(d.bal_open_shab).toFixed(2);
                if(d.bal_open_sick) document.getElementById('bal_open_sick').value = parseFloat(d.bal_open_sick).toFixed(2);
                if(d.bal_open_dec) document.getElementById('bal_open_dec').value = parseFloat(d.bal_open_dec).toFixed(2);
                if(d.bal_open_cho) document.getElementById('bal_open_cho').value = parseFloat(d.bal_open_cho).toFixed(2);
                
                if(d.carryOver) {
                    window.carryOverData = d.carryOver; 
                }
            }
            updateTitles();
        }).catch(err => console.error("שגיאה במשיכת נתונים:", err));
        
    } else {
        document.getElementById('authOverlay').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'none';
    }
});

window.loginUser = function() {
    var email = document.getElementById('authEmail').value;
    var pass = document.getElementById('authPassword').value;
    document.getElementById('authError').innerText = "";
    firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(error) {
        document.getElementById('authError').innerText = "שגיאה: אימייל או סיסמה שגויים.";
    });
};

window.registerUser = function() {
    var email = document.getElementById('authEmail').value;
    var pass = document.getElementById('authPassword').value;
    document.getElementById('authError').innerText = "";
    if(pass.length < 6) { document.getElementById('authError').innerText = "הסיסמה חייבת להכיל לפחות 6 תווים."; return; }
    
    firebase.auth().createUserWithEmailAndPassword(email, pass).catch(function(error) {
        document.getElementById('authError').innerText = "שגיאה: " + error.message;
    });
};

window.logoutUser = async function() {
    var empName = document.getElementById('employeeName').value.trim();
    if (!empName && !window.isBypassed) {
        customAlert("חובה להזין ולשמור שם עובד לפני ההתנתקות.");
        document.getElementById('employeeName').focus();
        return;
    }
    
    var b_reg = document.getElementById('bal_open_reg').value;
    var b_shab = document.getElementById('bal_open_shab').value;
    if (b_reg === "0.00" && b_shab === "0.00") {
        let ans = await customConfirm("שים לב, טרם הוקלדו יתרות פתיחה לחלק מהסעיפים. האם אתה בטוח שברצונך להתנתק?");
        if (!ans) return;
    }
    
    window.isBypassed = false;
    firebase.auth().signOut().then(() => {
        clearData();
    });
};

// --- Utilities ---
var daysHebrew = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
var columnsData = [
    { id: 'I', factor: 0.0 }, { id: 'J', factor: 1.0 }, { id: 'K', factor: 1.25 }, { id: 'L', factor: 1.5 }, 
    { id: 'M', factor: 1.75 }, { id: 'N', factor: 2.0 }, { id: 'O', factor: 1.8 }, { id: 'P', factor: 1.875 }, 
    { id: 'Q', factor: 2.25 }, { id: 'R', factor: 2.5 }, { id: 'S', factor: 0.2 }, { id: 'T', factor: 0.5 }, 
    { id: 'U', factor: 0.75 }, { id: 'V', factor: 0.875 }, { id: 'W', factor: 1.0 }
];

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function initMonthYearSelect() {
    var sel = document.getElementById('monthYearSelect');
    if(sel.options.length > 0) return;
    
    var months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    var now = new Date();
    
    var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var targetY = prevMonthDate.getFullYear();
    var targetM = prevMonthDate.getMonth() + 1;
    
    for (var y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
        for (var m = 1; m <= 12; m++) {
            var opt = document.createElement('option');
            opt.value = y + "-" + pad2(m);
            opt.text = months[m-1] + " " + y;
            if (y === targetY && m === targetM) opt.selected = true; 
            sel.add(opt);
        }
    }
}

function getSelectedMonthYear() {
    var val = document.getElementById('monthYearSelect').value;
    if(!val) return { y: new Date().getFullYear(), m: new Date().getMonth()+1 };
    var parts = val.split('-');
    return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10) };
}

function updateTitles() {
    var empName = document.getElementById('employeeName').value.trim();
    var selText = document.getElementById('monthYearSelect').options[document.getElementById('monthYearSelect').selectedIndex].text;
    
    document.getElementById('printMonthYearText').innerText = selText;
    
    var sheetTitle = document.getElementById('sheetTitle');
    var printEmpDisplay = document.getElementById('printEmployeeNameDisplay');
    var baseTitleStr = "דוח שעות משמרות - " + selText;
    
    if (empName !== "") {
        sheetTitle.innerText = baseTitleStr + " | עבור: " + empName;
        printEmpDisplay.innerText = "| עבור: " + empName;
        printEmpDisplay.style.display = "inline-block";
    } else {
        sheetTitle.innerText = baseTitleStr;
        printEmpDisplay.style.display = "none";
    }
    
    var cleanName = empName.replace(/\s+/g, '_');
    if (!cleanName) cleanName = "נתוני_משמרות";
    document.title = cleanName + "_" + selText.replace(' ', '_');
}

window.toggleLock = function(inputId, btn) {
    let inp = document.getElementById(inputId);
    if (inp.readOnly) {
        inp.readOnly = false;
        inp.classList.remove('locked-input');
        btn.innerText = '🔓';
    } else {
        inp.readOnly = true;
        inp.classList.add('locked-input');
        btn.innerText = '🔒';
    }
};

window.openMiniShiftInfo = function() { document.getElementById('miniShiftInfoModal').style.display = "block"; };
window.closeMiniShiftInfo = function() { document.getElementById('miniShiftInfoModal').style.display = "none"; };
window.openShiftInfo = function() { document.getElementById('shiftInfoModal').style.display = "block"; };
window.closeShiftInfo = function() { document.getElementById('shiftInfoModal').style.display = "none"; };

window.onclick = function(event) {
    if (event.target == document.getElementById('shiftInfoModal')) closeShiftInfo();
    if (event.target == document.getElementById('miniShiftInfoModal')) closeMiniShiftInfo();
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
    if (fileInput) fileInput.click();
};

window.handleFileLoad = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            var data = JSON.parse(e.target.result);
            if (data.month && data.year) {
                document.getElementById('monthYearSelect').value = data.year + "-" + pad2(data.month);
            }
            if (data.hourlyRate) document.getElementById('hourlyRate').value = data.hourlyRate;
            if (data.eshelRate) document.getElementById('eshelRate').value = data.eshelRate;
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
            customAlert('הנתונים נטענו בהצלחה!');
        } catch(err) { customAlert("שגיאה בטעינת הקובץ."); }
    };
    reader.readAsText(file);
};

window.saveData = async function(silent = false) {
    var empName = document.getElementById('employeeName').value.trim();
    if(!empName) { 
        if(!silent) customAlert("הכנס שם עובד לפני השמירה."); 
        return; 
    }
    
    var user = firebase.auth().currentUser;
    if(!user && !window.isBypassed) return;
    
    var isUnlocked = false;
    ['bal_open_reg', 'bal_open_shab', 'bal_open_sick', 'bal_open_dec', 'bal_open_cho'].forEach(id => {
        if(!document.getElementById(id).readOnly) isUnlocked = true;
    });
    
    if (isUnlocked && !silent) {
        let ans = await customConfirm("שמנו לב ששינית את יתרת הפתיחה באופן ידני. האם לשמור את היתרה החדשה?");
        if(!ans) return;
    }
    
    var data = {
        employeeName: empName,
        hourlyRate: document.getElementById('hourlyRate').value,
        eshelRate: document.getElementById('eshelRate').value,
        bal_open_reg: document.getElementById('bal_open_reg').value,
        bal_open_shab: document.getElementById('bal_open_shab').value,
        bal_open_sick: document.getElementById('bal_open_sick').value,
        bal_open_dec: document.getElementById('bal_open_dec').value,
        bal_open_cho: document.getElementById('bal_open_cho').value,
        carryOver: window.carryOverData 
    };
    
    if (user) {
        user.updateProfile({ displayName: empName }).then(() => {
            db.collection("users").doc(user.uid).set(data, { merge: true }).then(() => {
                if(!silent) customAlert("הנתונים נשמרו בהצלחה.");
                ['bal_open_reg', 'bal_open_shab', 'bal_open_sick', 'bal_open_dec', 'bal_open_cho'].forEach(id => {
                    let inp = document.getElementById(id);
                    inp.readOnly = true;
                    inp.classList.add('locked-input');
                    inp.nextElementSibling.innerText = '🔒';
                });
            }).catch(err => { if(!silent) customAlert("שגיאה בשמירה: " + err.message); });
        });
    }
};

window.closeMonth = async function() {
    let ans = await customConfirm("שים לב, אתה עומד לשמור את היתרות החדשות האם להמשיך?");
    if(!ans) return;
    
    document.getElementById('bal_open_reg').value = document.getElementById('bal_close_reg').innerText;
    document.getElementById('bal_open_shab').value = document.getElementById('bal_close_shab').innerText;
    document.getElementById('bal_open_sick').value = document.getElementById('bal_close_sick').innerText;
    
    var decUsed = parseFloat(document.getElementById('bal_used_dec').innerText) || 0;
    var openDec = parseFloat(document.getElementById('bal_open_dec').value) || 0;
    document.getElementById('bal_open_dec').value = (openDec - decUsed).toFixed(2);
    
    var choUsed = parseFloat(document.getElementById('bal_used_cho').innerText) || 0;
    var openCho = parseFloat(document.getElementById('bal_open_cho').value) || 0;
    document.getElementById('bal_open_cho').value = (openCho - choUsed).toFixed(2);

    var ym = getSelectedMonthYear();
    var year = ym.y;
    var month = ym.m;
    var daysInMonth = new Date(year, month, 0).getDate();
    
    var lastDayObj = new Date(year, month - 1, daysInMonth);
    var tailShifts = 0;
    
    if (lastDayObj.getDay() !== 6) {
        var lastSunday = 1;
        for (var i = daysInMonth; i >= 1; i--) {
            if (new Date(year, month - 1, i).getDay() === 0) { lastSunday = i; break; }
        }
        for (var r = lastSunday; r <= daysInMonth; r++) {
            var valC = document.getElementById('val-cost-' + r);
            if (!valC) continue;
            var shiftInput = document.querySelector('tr:nth-child(' + r + ') .shift-type-input');
            var sVal = shiftInput ? shiftInput.value.trim() : '';
            var isAbs = ['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ'].includes(sVal);
            var isSft = valC.getAttribute('data-is-shift') === '1';
            if (isAbs || isSft) tailShifts++;
        }
    }
    
    var nextM = month + 1;
    var nextY = year;
    if (nextM > 12) { nextM = 1; nextY++; }
    var nextKey = nextY + "-" + pad2(nextM);
    
    window.carryOverData[nextKey] = tailShifts;

    window.saveData(true); 
    customAlert("חודש נסגר בהצלחה. יתרות ומידע חריגות עודכנו למערכת.");
};

window.saveFirstMonthCarry = function() {
    var val = parseInt(document.getElementById('manualCarryInput').value, 10);
    if(isNaN(val) || val < 0) val = 0;
    
    var ym = getSelectedMonthYear();
    var curKey = ym.y + "-" + pad2(ym.m);
    
    window.carryOverData[curKey] = val;
    window.saveData(true);
    
    document.getElementById('firstMonthCarryModal').style.display = 'none';
    updateGrandTotal(); 
};

window.generateTable = function() {
    var empName = document.getElementById('employeeName').value.trim();
    if (!empName) {
        customAlert("הכנס שם עובד");
        document.getElementById('employeeName').focus();
        return;
    }

    var ym = getSelectedMonthYear();
    var year = ym.y;
    var month = ym.m;
    var curKey = year + "-" + pad2(month);
    
    var currentEshel = parseFloat(document.getElementById('eshelRate').value) || 0;
    if ([1, 4, 7, 10].includes(month) && currentEshel < MINIMUM_ESHEL_RATE) {
        customAlert("שים לב, תחילת רבעון: תעריף האש\"ל המעודכן הוא " + MINIMUM_ESHEL_RATE + " ₪. נא לעדכן בהתאם.");
    }

    if (window.carryOverData[curKey] === undefined) {
        document.getElementById('firstMonthCarryModal').style.display = 'block';
    }

    updateTitles();
    
    var daysInMonth = new Date(year, month, 0).getDate();
    var tbody = document.getElementById('tbody');
    var htmlContent = '';
    
    var weekToggle = 0; 

    for (var i = 1; i <= daysInMonth; i++) {
        var dateObj = new Date(year, month - 1, i);
        var dayNum = dateObj.getDay(); 
        
        if (dayNum === 0 && i > 1) {
            weekToggle = 1 - weekToggle;
        }
        
        var rowColor = weekToggle === 0 ? "#e8f5e9" : "#fff3e0"; 
        
        var dateStr = pad2(i); 
        var dayClass = (dayNum === 5) ? "day-fri" : (dayNum === 6) ? "day-sat" : "";

        var curDateStr = year + "-" + pad2(month) + "-" + pad2(i);
        
        var holObj = (window.HOLIDAYS_DB && window.HOLIDAYS_DB[curDateStr]) ? window.HOLIDAYS_DB[curDateStr] : null;
        var holText = holObj ? holObj.hebrew : '';
        var descColor = holObj ? '#e67e22' : '#1565c0';

        htmlContent += '<tr style="background-color: ' + rowColor + ';">' +
            '<td class="'+dayClass+'" style="width: 30px; min-width: 30px;">' + dateStr + '</td>' +
            '<td class="'+dayClass+' col-sep" style="width: 30px; min-width: 30px;">' + daysHebrew[dayNum] + '</td>' +
            '<td class="'+dayClass+' col-sep hide-print"><input type="text" class="shift-type-input" maxlength="3" style="width: 35px; padding: 2px;" oninput="handleShiftType(this)"></td>' +
            '<td class="'+dayClass+' print-thick-right"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)" data-date="'+year+'-'+month+'-'+i+'"></td>' +
            '<td class="col-sep '+dayClass+'"><input type="text" class="time-input empty-print" maxlength="5" placeholder="" onchange="formatTimeInput(this)"></td>' +
            '<td class="'+dayClass+' col-sep" id="val-desc-'+i+'" style="font-size: 12px; font-weight: bold; color: '+descColor+'; background-color: rgba(248, 251, 255, 0.5); text-align: right; padding-right: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" data-hol="'+holText+'">' + holText + '</td>' +
            '<td class="val-cell '+dayClass+'" id="val-total-hours-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+'" id="val-shabbat-hours-'+i+'" data-val="0"></td>' +
            '<td class="col-sep val-cell '+dayClass+' thick-border-left" id="val-I-'+i+'" data-val="0"></td>' +
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
    tbody.innerHTML = htmlContent;
    document.getElementById('tableContainer').style.display = 'block';
    document.getElementById('summaryPanel').style.display = 'flex';
    // הטבלה עכשיו נשלטת רק ע"י CSS (מוסתרת במסך, מוצגת בהדפסה)
    document.getElementById('printBtn').style.display = 'inline-block';
    document.getElementById('closeMonthBtn').style.display = 'inline-block';
    updateGrandTotal();
};

window.handleShiftType = function(input) {
    var val = input.value.trim().replace(/"/g, '').replace(/'/g, ''); 
    var tr = input.closest('tr');
    if (!tr) return;

    var timeInputs = tr.querySelectorAll('.time-input');
    if (!timeInputs || timeInputs.length < 2) return;

    var shifts = {
        'ב': ['07:00', '19:00'], 'ל': ['19:00', '07:00'],
        '615': ['06:00', '15:00'], '616': ['06:00', '16:00'], '617': ['06:00', '17:00'],
        'ב06': ['07:00', '18:00'], 'ב16': ['07:00', '16:00'],
        '102': ['10:00', '20:00'], '111': ['11:00', '20:00'], '112': ['11:00', '22:15'], '132': ['13:00', '22:15'],
        '207': ['20:00', '07:00'], '217': ['21:00', '07:00'], '227': ['22:00', '07:00'], '228': ['22:00', '08:00']
    };

    if (shifts[val]) {
        timeInputs[0].value = shifts[val][0];
        timeInputs[1].value = shifts[val][1];
        timeInputs[0].classList.remove('empty-print');
        timeInputs[1].classList.remove('empty-print');
    } else if (['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ'].includes(val) || val === '') {
        timeInputs[0].value = '';
        timeInputs[1].value = '';
        timeInputs[0].classList.add('empty-print');
        timeInputs[1].classList.add('empty-print');
    }
    
    calculateRow(timeInputs[0]);
};

window.calculateRow = function(inputElem) {
    try {
        var tr = inputElem.closest('tr');
        var timeInputs = tr.querySelectorAll('.time-input');
        var startInput = timeInputs[0].value;
        var endInput = timeInputs[1].value;
        
        if (startInput) timeInputs[0].classList.remove('empty-print'); else timeInputs[0].classList.add('empty-print');
        if (endInput) timeInputs[1].classList.remove('empty-print'); else timeInputs[1].classList.add('empty-print');

        var dateString = timeInputs[0].getAttribute('data-date');
        var rowId = dateString.split('-')[2]; 
        var costCell = document.getElementById('val-cost-' + rowId);
        var totalHoursCell = document.getElementById('val-total-hours-' + rowId);
        var shabbatHoursCell = document.getElementById('val-shabbat-hours-' + rowId);
        
        var shiftInput = tr.querySelector('.shift-type-input');
        var shiftVal = shiftInput ? shiftInput.value.trim().replace(/"/g, '').replace(/'/g, '') : '';
        var isAbsence = ['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ'].includes(shiftVal);

        var descCell = document.getElementById('val-desc-' + rowId);
        if (descCell) {
            var holText = descCell.getAttribute('data-hol') || '';
            var baseDesc = '';
            
            if (isAbsence) {
                let m = {'ח':'חופש','חש':'חופש שבת','מח':'מחלה','הצ':'הצהרה','בח':'בחירה','מבמ':'מחלת בן משפחה'};
                baseDesc = m[shiftVal];
            } else if (startInput && endInput) {
                baseDesc = 'נוכחות';
            }
            
            if (baseDesc && holText) { 
                descCell.innerHTML = `<span style="color:#1565c0">${baseDesc}</span> (<span style="color:#e67e22">${holText}</span>)`; 
            } else if (baseDesc) { 
                descCell.innerHTML = `<span style="color:#1565c0">${baseDesc}</span>`; 
            } else if (holText) { 
                descCell.innerHTML = `<span style="color:#e67e22">${holText}</span>`; 
            } else { descCell.innerHTML = ''; }
        }

        if (!startInput || !endInput || startInput.indexOf(':') === -1 || endInput.indexOf(':') === -1) {
            if (totalHoursCell) { totalHoursCell.innerText = ''; totalHoursCell.setAttribute('data-val', '0'); }
            if (shabbatHoursCell) {
                if (shiftVal === 'חש') { shabbatHoursCell.innerText = '-1.00'; shabbatHoursCell.setAttribute('data-val', '-1'); } 
                else { shabbatHoursCell.innerText = ''; shabbatHoursCell.setAttribute('data-val', '0'); }
            }
            
            for(var c = 0; c < columnsData.length; c++) {
                var cell1 = document.getElementById('val-' + columnsData[c].id + '-' + rowId);
                if(cell1) { 
                    if (columnsData[c].id === 'I' && isAbsence) { cell1.innerText = '8.00'; cell1.setAttribute('data-val', '8'); } 
                    else { cell1.innerText = ''; cell1.setAttribute('data-val', '0'); }
                }
            }
            if(costCell) { costCell.innerText = ''; costCell.setAttribute('data-is-shift', '0'); costCell.setAttribute('data-cost', '0'); costCell.setAttribute('data-gross', '0'); }
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
        var qualifiesForAfternoon = (startH + startM/60 >= 14 || afternoonMinutesCount >= 180);
        var enteredBefore3 = (startH + startM/60 >= 12 || startH + startM/60 <= 3.0);

        var m = { I:0, J:0, K:0, L:0, M:0, N:0, O:0, P:0, Q:0, R:0, S:0, T:0, U:0, V:0, W:0 };
        var shabbatMinutesCount = 0;

        var baseDateStr = shiftDate.getFullYear() + "-" + pad2(shiftDate.getMonth()+1) + "-" + pad2(shiftDate.getDate());
        var baseHolObj = window.HOLIDAYS_DB ? window.HOLIDAYS_DB[baseDateStr] : null;
        var isBaseDayErevHag = (baseHolObj && baseHolObj.type === 'eve');
        var isBaseDayHoliday = (baseHolObj && baseHolObj.type === 'holiday');

        if (baseDay === 6 && isBaseDayErevHag && !isNightShift) {
            var stdMins = (baseHolObj && baseHolObj.standardHours) ? (baseHolObj.standardHours * 60) : 330; 
            m.I = Math.min(totalMinutes, stdMins);                  
            m.J = Math.max(0, Math.min(totalMinutes - stdMins, 60)); 
            m.K = Math.max(0, Math.min(totalMinutes - (stdMins + 60), 120)); 
            var remMins = Math.max(0, totalMinutes - (stdMins + 180));       
            m.L = remMins; m.O = remMins;                                       
        } else {
            var ot1_Minutes = 8 * 60, ot2_Minutes = 10 * 60;
            if (baseHolObj && baseHolObj.standardHours !== undefined && !isNightShift) {
                ot1_Minutes = baseHolObj.standardHours * 60;
                ot2_Minutes = ot1_Minutes + 120;
            } else if (baseDay === 6) { ot1_Minutes = 6.5 * 60; ot2_Minutes = 8.5 * 60; } 
            else if (isNightShift) { ot1_Minutes = 7 * 60; ot2_Minutes = 9 * 60; }

            for (var j = 1; j <= totalMinutes; j++) {
                var absH = dStart + (j - 0.5) / 60;
                var cDayNum2 = ((baseDay - 1 + Math.floor(absH / 24)) % 7) + 1;
                var cHourDec2 = absH % 24;
                
                var minuteDate = new Date(shiftDate.getTime());
                if (absH >= 24) minuteDate.setDate(minuteDate.getDate() + 1);
                var minDateStr = minuteDate.getFullYear() + "-" + pad2(minuteDate.getMonth()+1) + "-" + pad2(minuteDate.getDate());
                var holObj = window.HOLIDAYS_DB ? window.HOLIDAYS_DB[minDateStr] : null;

                var prevDate = new Date(minuteDate.getTime()); prevDate.setDate(prevDate.getDate() - 1);
                var prevDateStr = prevDate.getFullYear() + "-" + pad2(prevDate.getMonth()+1) + "-" + pad2(prevDate.getDate());
                var prevHolObj = window.HOLIDAYS_DB ? window.HOLIDAYS_DB[prevDateStr] : null;

                var isStrictShab = false;
                if (cDayNum2 === 6 && cHourDec2 >= shabbatStartHour) isStrictShab = true; 
                else if (cDayNum2 === 7) isStrictShab = true; 
                else if (cDayNum2 === 1 && cHourDec2 < 6) isStrictShab = true;
                
                if (holObj && holObj.type === 'holiday') isStrictShab = true;
                if (prevHolObj && prevHolObj.type === 'holiday' && cHourDec2 < 6) isStrictShab = true;

                var isShab = isStrictShab;
                if (isBaseDayHoliday && isNightShift) isShab = true;

                var isShabForVacation = isStrictShab;
                if (baseDay === 6 && isBaseDayErevHag && !isNightShift) isShabForVacation = false;
                if (isShabForVacation) shabbatMinutesCount++;

                var isNight = (cHourDec2 >= 22 || cHourDec2 < 6);
                if (isNightShift && enteredBefore3 && absH >= (startH<6?6:30)) isNight = true; 
                if (isBaseDayHoliday && isNightShift && j > ot1_Minutes) isNight = true; 
                
                var payMult = 1.0;
                if (isShab) payMult = isNight ? 2.0 : 1.75; 
                else if (isNight) payMult = 1.5; 
                else if (cHourDec2 >= 14 && cHourDec2 < 22 && qualifiesForAfternoon) payMult = 1.2;
                
                var otMult = 1.0; 
                if (j > ot2_Minutes) otMult = 1.5; else if (j > ot1_Minutes) otMult = 1.25;

                var fMult = Math.round((isShab ? payMult + (otMult - 1) : payMult * otMult) * 1000) / 1000;
                
                if (otMult === 1.0) {
                    if (isShab) { m.I++; if (payMult === 1.75) m.U++; else if (payMult === 2.0) m.W++; } 
                    else { m.I++; if (payMult === 1.2) m.S++; else if (payMult === 1.5) m.T++; }
                } else {
                    if (fMult === 1.25) m.K++; else if (fMult === 1.5) m.L++; else if (fMult === 1.75) m.M++;
                    else if (fMult === 1.8) m.O++; else if (fMult === 1.875) m.P++; else if (fMult === 2.0) m.N++; 
                    else if (fMult === 2.25) m.Q++; else if (fMult === 2.5) m.R++; else { if (!isShab && otMult===1.25) m.K++; else m.J++; }
                }
            }
        }

        if (isAbsence) m.I += 480; 

        if (shabbatHoursCell) {
            var displayShabDays = (shabbatMinutesCount / 60) / 8;
            if (shiftVal === 'חש') displayShabDays -= 1; 
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
    } catch(e) { customAlert("שגיאה בחישוב השורה: " + e.message); }
};

window.updateGrandTotal = function() {
    var rate = parseFloat(document.getElementById('hourlyRate').value) || 0;
    var totalDailyCostSum = 0, totalGrossMin = 0, totalShifts = 0;
    var totalHoursOverall = 0, sumTotalShiftHours = 0, sumTotalShabbatDays = 0;
    
    var usedReg = 0, usedSick = 0, usedDec = 0, usedCho = 0, usedFam = 0;
    var colTotals = {};
    for(var c=0; c<columnsData.length; c++) { colTotals[columnsData[c].id] = 0; }

    var ym = getSelectedMonthYear();
    var year = ym.y;
    var month = ym.m;
    var curKey = year + "-" + pad2(month);
    
    var carryOverShifts = (window.carryOverData && window.carryOverData[curKey]) ? parseInt(window.carryOverData[curKey], 10) : 0;
    
    var weekShiftsCount = {}; 
    var weekIndex = 0;

    for(var r=1; r<=31; r++) {
        var cell = document.getElementById('val-cost-' + r);
        if(!cell) continue;

        var dObj = new Date(year, month - 1, r);
        if (dObj.getDay() === 0 && r > 1) {
            weekIndex++; 
        }

        var cellTH = document.getElementById('val-total-hours-' + r);
        if (cellTH) sumTotalShiftHours += parseFloat(cellTH.getAttribute('data-val') || 0);
        
        var cellSH = document.getElementById('val-shabbat-hours-' + r);
        if (cellSH) sumTotalShabbatDays += parseFloat(cellSH.getAttribute('data-val') || 0);

        var shiftInput = document.querySelector('tr:nth-child(' + r + ') .shift-type-input');
        var shiftVal = shiftInput ? shiftInput.value.trim().replace(/"/g, '').replace(/'/g, '') : '';
        
        if(shiftVal === 'ח') usedReg += 1;
        if(shiftVal === 'מח') usedSick += 1;
        if(shiftVal === 'הצ') usedDec += 1;
        if(shiftVal === 'בח') usedCho += 1;
        if(shiftVal === 'מבמ') usedFam += 1;

        var isAbsence = ['ח', 'חש', 'מח', 'הצ', 'בח', 'מבמ'].includes(shiftVal);
        var hasShift = cell.getAttribute('data-is-shift') === '1';

        if (hasShift || isAbsence) {
            weekShiftsCount[weekIndex] = (weekShiftsCount[weekIndex] || 0) + 1;
            
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
    
    weekShiftsCount[0] = (weekShiftsCount[0] || 0) + carryOverShifts;
    var isOverLimit = false;
    for (var w in weekShiftsCount) {
        if (weekShiftsCount[w] > 5) isOverLimit = true;
    }
    
    var warnDiv = document.getElementById('weeklyWarning');
    if (warnDiv) {
        if (isOverLimit) {
            warnDiv.style.display = 'block';
            warnDiv.innerHTML = "⚠️ שים לב! חרגת ממכסת 5 משמרות באחד או יותר מהשבועות בחודש <br><span style='font-size:13px; font-weight:normal;'>(כולל " + carryOverShifts + " משמרות שנגררו מסוף החודש הקודם)</span>";
        } else {
            warnDiv.style.display = 'none';
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
    
    document.getElementById('sum-hours-total').innerText = totalHoursOverall > 0 ? totalHoursOverall.toFixed(2) : '0.00'; 
    document.getElementById('sum-cost-total').innerText = tlushCost > 0 ? tlushCost.toFixed(2) : '0.00'; 
    
    var eshelRate = parseFloat(document.getElementById('eshelRate').value) || 0;
    var eshelCost = Math.floor((totalGrossMin / 60) / 8) * eshelRate;
    
    document.getElementById('dashShifts').innerText = totalShifts;
    document.getElementById('dashStandard').innerText = (colTotals['I'] || 0).toFixed(2);
    document.getElementById('dashGross').innerText = (totalGrossMin / 60).toFixed(2);
    document.getElementById('dashEshel').innerText = eshelCost.toFixed(2) + ' ₪';
    document.getElementById('tlushCost').innerText = tlushCost.toFixed(2) + ' ₪';
    
    document.getElementById('bal_used_reg').innerText = usedReg.toFixed(2);
    var oReg = parseFloat(document.getElementById('bal_open_reg').value) || 0;
    document.getElementById('bal_close_reg').innerText = (oReg - usedReg).toFixed(2);
    
    document.getElementById('bal_used_shab').innerText = (sumTotalShabbatDays > 0 ? "+" : "") + sumTotalShabbatDays.toFixed(2);
    var oShab = parseFloat(document.getElementById('bal_open_shab').value) || 0;
    document.getElementById('bal_close_shab').innerText = (oShab + sumTotalShabbatDays).toFixed(2);

    document.getElementById('bal_used_sick').innerText = usedSick.toFixed(2);
    var oSick = parseFloat(document.getElementById('bal_open_sick').value) || 0;
    document.getElementById('bal_close_sick').innerText = (oSick - usedSick).toFixed(2);

    document.getElementById('bal_used_dec').innerText = usedDec;
    document.getElementById('bal_used_cho').innerText = usedCho;
    document.getElementById('bal_used_fam').innerText = usedFam.toFixed(2);

    // הזנת נתונים לטבלת הסיכום החדשה בתחתית הדף
    document.getElementById('tbl_bal_open_reg').innerText = oReg.toFixed(2);
    document.getElementById('tbl_bal_used_reg').innerText = usedReg.toFixed(2);
    document.getElementById('tbl_bal_close_reg').innerText = (oReg - usedReg).toFixed(2);

    document.getElementById('tbl_bal_open_shab').innerText = oShab.toFixed(2);
    document.getElementById('tbl_bal_used_shab').innerText = (sumTotalShabbatDays > 0 ? "+" : "") + sumTotalShabbatDays.toFixed(2);
    document.getElementById('tbl_bal_close_shab').innerText = (oShab + sumTotalShabbatDays).toFixed(2);

    document.getElementById('tbl_bal_open_sick').innerText = oSick.toFixed(2);
    document.getElementById('tbl_bal_used_sick').innerText = usedSick.toFixed(2);
    document.getElementById('tbl_bal_close_sick').innerText = (oSick - usedSick).toFixed(2);

    var oDec = parseFloat(document.getElementById('bal_open_dec').value) || 0;
    document.getElementById('tbl_bal_open_dec').innerText = oDec.toFixed(2);
    document.getElementById('tbl_bal_used_dec').innerText = usedDec;
    document.getElementById('tbl_bal_close_dec').innerText = (oDec - usedDec).toFixed(2);

    var oCho = parseFloat(document.getElementById('bal_open_cho').value) || 0;
    document.getElementById('tbl_bal_open_cho').innerText = oCho.toFixed(2);
    document.getElementById('tbl_bal_used_cho').innerText = usedCho;
    document.getElementById('tbl_bal_close_cho').innerText = (oCho - usedCho).toFixed(2);

    document.getElementById('printDashShifts').innerText = totalShifts;
    document.getElementById('printDashStandard').innerText = (colTotals['I'] || 0).toFixed(2);
    document.getElementById('printDashGross').innerText = (totalGrossMin / 60).toFixed(2);
    document.getElementById('printDashEshel').innerText = eshelCost.toFixed(2) + ' ₪';
    document.getElementById('tlushCostPrint').innerText = tlushCost.toFixed(2) + ' ₪';
};

document.addEventListener('keydown', function(e) {
    var el = e.target;
    if (el.tagName === 'INPUT' && (el.classList.contains('shift-type-input') || el.classList.contains('time-input'))) {
        
        if (e.key === 'Enter') {
            e.preventDefault();
            var tr = el.closest('tr');
            if (!tr) return;
            var inputs = Array.from(tr.querySelectorAll('.time-input'));
            
            if (el === inputs[0]) {
                inputs[1].focus(); 
            } else if (el === inputs[1]) {
                var nextTr = tr.nextElementSibling; 
                if (nextTr) {
                    var nextInput = nextTr.querySelector('.time-input');
                    if(nextInput) nextInput.focus();
                }
            } else if (el.classList.contains('shift-type-input')) {
                if(inputs.length > 0) inputs[0].focus();
            }
            return;
        }

        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (el.classList.contains('time-input') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return; 
            var row = el.closest('tr');
            if (!row) return;
            var inputsInRow = Array.from(row.querySelectorAll('input.shift-type-input, input.time-input'));
            var inputIndex = inputsInRow.indexOf(el);
            var targetInput = null;

            if (e.key === 'ArrowDown') {
                var tTr = row.nextElementSibling;
                if (tTr) targetInput = Array.from(tTr.querySelectorAll('input.shift-type-input, input.time-input'))[inputIndex];
            } else if (e.key === 'ArrowUp') {
                var prevTr = row.previousElementSibling;
                if (prevTr) targetInput = Array.from(prevTr.querySelectorAll('input.shift-type-input, input.time-input'))[inputIndex];
            } else if (e.key === 'ArrowLeft') {
                if (inputIndex < inputsInRow.length - 1) targetInput = inputsInRow[inputIndex + 1]; 
                else {
                    var nTr = row.nextElementSibling;
                    if (nTr) targetInput = Array.from(nTr.querySelectorAll('input.shift-type-input, input.time-input'))[0];
                }
            } else if (e.key === 'ArrowRight') {
                if (inputIndex > 0) targetInput = inputsInRow[inputIndex - 1]; 
                else {
                    var pTr = row.previousElementSibling;
                    if (pTr) {
                        var pInputs = Array.from(pTr.querySelectorAll('input.shift-type-input, input.time-input'));
                        if (pInputs.length > 0) targetInput = pInputs[pInputs.length - 1];
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
    initMonthYearSelect();
    
    var tbody = document.getElementById('tbody');
    if (tbody) tbody.innerHTML = '';
    
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('summaryPanel').style.display = 'none';
    document.getElementById('printBtn').style.display = 'none';
    document.getElementById('closeMonthBtn').style.display = 'none';
    document.getElementById('weeklyWarning').style.display = 'none';
    updateTitles();
};

window.onload = function() {
    try { clearData(); } catch(e) { console.error("שגיאה באתחול ראשוני: ", e); }
};