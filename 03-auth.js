/* COT System Version: V202610302143 */
// קובץ: 03-auth.js
// הרשמה, כניסה, איפוס סיסמה, מצב הבדיקות הסמוי (secretBypass), נעילת מסך בחוסר פעילות, והתנתקות.

// מתג למצב הבדיקות הסמוי (3 לחיצות על הלוגו). בגרסת ייצור מומלץ להגדיר false.
const ENABLE_TEST_BYPASS = true;

window.isBypassed = false;
let clickCount = 0;
let clickTimer;
window.windowTypedPassword = null;
window.isRegisteringNewUser = false;

window.secretBypass = async function(e) {
    if(e) e.preventDefault();
    if (!ENABLE_TEST_BYPASS) return;
    clickCount++;
    clearTimeout(clickTimer);
    if(clickCount >= 3) {
        clickCount = 0; 
        let now = new Date();
        let expectedPass = String(999999 - parseInt(String(now.getDate()).padStart(2,'0') + String(now.getMonth()+1).padStart(2,'0') + String(now.getFullYear()).slice(-2), 10)); 
        let pwd = await customPrompt("הזן קוד אבטחה:");
        if (pwd === expectedPass) {
            window.isBypassed = true;
            if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'none';
            if(document.getElementById('forcePasswordScreen')) document.getElementById('forcePasswordScreen').style.display = 'none';
            if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').style.display = 'inline-block';
            if(document.getElementById('loginPassword')) document.getElementById('loginPassword').value = ''; 
            if (window.isScreenLocked) { window.isScreenLocked = false; window.lockedEmail = null; return; }
            
            // --- Feature Update: Silent Login & Generate Table ---
            if(document.getElementById('employeeName')) document.getElementById('employeeName').value = 'בדיקות דוח';
            window.isTesterMode = true; 
            initMonthYearSelect(); 
            updateTitles();
            generateTable(); // This actually renders the main interface after bypass!
            
        } else if (pwd !== null) { customAlert("קוד שגוי."); }
    } else { clickTimer = setTimeout(() => { clickCount = 0; }, 2000); }
};

window.isStrong = function(val) { return val.length >= 8 && /^[A-Za-z0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]*$/.test(val) && /[a-zA-Z]/.test(val) && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]/.test(val); };

window.checkPwd = function(val, prefix) {
    document.getElementById(prefix + '-req-len').className = val.length >= 8 ? 'valid' : 'invalid';
    document.getElementById(prefix + '-req-eng').className = (val.length > 0 && /^[A-Za-z0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]*$/.test(val) && /[a-zA-Z]/.test(val)) ? 'valid' : 'invalid';
    document.getElementById(prefix + '-req-up').className = /[A-Z]/.test(val) ? 'valid' : 'invalid';
    document.getElementById(prefix + '-req-num').className = /[0-9]/.test(val) ? 'valid' : 'invalid';
    document.getElementById(prefix + '-req-spc').className = /[!@#$%^&*()_+={}\[\]|\\:;"'<>,.?/-]/.test(val) ? 'valid' : 'invalid';
};

// מתג העין - פועל באופן דינמי לכל שדה בנפרד
window.resetPassword = function() {
    let email = document.getElementById('loginEmail').value.trim();
    let errEl = document.getElementById('loginError');
    let successEl = document.getElementById('loginSuccess');
    if(errEl) errEl.style.display = "none"; 
    if(successEl) successEl.style.display = "none";
    
    if (!email) {
        if(errEl) { errEl.innerText = "אנא הזן כתובת אימייל כדי לקבל קישור לאיפוס סיסמה."; errEl.style.display = "block"; }
        else customAlert("אנא הזן כתובת אימייל כדי לקבל קישור לאיפוס סיסמה.");
        return;
    }
    
    showLoading(true);
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            showLoading(false);
            if(successEl) { successEl.innerText = "אם הכתובת קיימת במערכת, קישור לאיפוס סיסמה נשלח אליה כעת."; successEl.style.display = "block"; }
            else customAlert("אם הכתובת קיימת במערכת, קישור לאיפוס סיסמה נשלח אליה כעת.");
        })
        .catch((error) => {
            showLoading(false);
            if(errEl) { errEl.innerText = "שגיאה בשליחה. ודא שכתובת המייל שהזנת תקינה."; errEl.style.display = "block"; }
            else customAlert("שגיאה בשליחה. ודא שכתובת המייל שהזנת תקינה.");
        });
};

window.registerUser = function() {
    let email = document.getElementById('regEmail').value.trim();
    let pass = document.getElementById('regPassword').value;
    let passConfirm = document.getElementById('regPasswordConfirm').value;
    let errEl = document.getElementById('regError'); 
    if(errEl) errEl.innerText = "";
    if (!isStrong(pass)) { 
        if(errEl) { errEl.innerText = "הסיסמה אינה עומדת בכל התנאים המפורטים מטה."; errEl.style.display = "block"; }
        else customAlert("הסיסמה אינה עומדת בכל התנאים המפורטים מטה.");
        return; 
    }
    if (pass !== passConfirm) { 
        if(errEl) { errEl.innerText = "הסיסמאות אינן תואמות. הקלד שוב."; errEl.style.display = "block"; }
        else customAlert("הסיסמאות אינן תואמות. הקלד שוב.");
        return; 
    }
    
    window.isRegisteringNewUser = true; showLoading(true);
    firebase.auth().createUserWithEmailAndPassword(email, pass).then((cred) => {
        return db.collection("users").doc(cred.user.uid).set({ hasStrongPassword: true }, { merge: true }).then(() => cred);
    }).then((cred) => {
        cred.user.sendEmailVerification(); showLoading(false);
        customAlert("החשבון נוצר בהצלחה! שלחנו לך מייל אימות.");
    }).catch(e => { 
        showLoading(false); window.isRegisteringNewUser = false; 
        if(errEl) { errEl.innerText = "שגיאה: " + e.message; errEl.style.display = "block"; }
        else customAlert("שגיאה: " + e.message); 
    });
};

window.loginUser = function() {
    let email = document.getElementById('loginEmail').value.trim();
    let pass = document.getElementById('loginPassword').value;
    let errEl = document.getElementById('loginError'); 
    let sucEl = document.getElementById('loginSuccess');
    if(sucEl) sucEl.style.display = "none";
    if(errEl) errEl.innerText = "";
    
    window.windowTypedPassword = pass; showLoading(true);
    firebase.auth().signInWithEmailAndPassword(email, pass).catch(e => { 
        showLoading(false); 
        if(errEl) { errEl.innerText = "שגיאה: אימייל או סיסמה שגויים."; errEl.style.display = "block"; }
        else customAlert("שגיאה: אימייל או סיסמה שגויים.");
    });
};

window.enterMainApp = function(user, userDoc = null) {
    if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'none';
    if(document.getElementById('forcePasswordScreen')) document.getElementById('forcePasswordScreen').style.display = 'none';
    if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').style.display = 'inline-block';
    if(document.getElementById('loginPassword')) document.getElementById('loginPassword').value = '';

    if (window.isScreenLocked) {
        if (window.lockedEmail && user.email.toLowerCase() === window.lockedEmail.toLowerCase()) {
            window.isScreenLocked = false; window.lockedEmail = null; return;
        } else {
            window.isScreenLocked = false; window.lockedEmail = null; if(window.clearData) window.clearData(true);
        }
    }
    initMonthYearSelect();

    let processDoc = (doc) => {
        if (doc.exists) {
            let d = doc.data();
            if(d.employeeName) document.getElementById('employeeName').value = d.employeeName;
            if(d.hourlyRate) document.getElementById('hourlyRate').value = d.hourlyRate;
            if(d.eshelRate) document.getElementById('eshelRate').value = d.eshelRate;
            if(d.carryOver) Object.assign(window.carryOverData, d.carryOver);
            if (d.monthlyBalances) Object.assign(window.monthlyBalances, d.monthlyBalances);
            else {
                let curKey = getSelectedMonthYear().y + "-" + pad2(getSelectedMonthYear().m);
                window.monthlyBalances[curKey] = { reg: parseFloat(d.bal_open_reg||0), shab: parseFloat(d.bal_open_shab||0), sick: parseFloat(d.bal_open_sick||0), dec: parseFloat(d.bal_open_dec||0), cho: parseFloat(d.bal_open_cho||0) };
            }
            updateCloudBalancesPanel();
            
            let activeKey = window.getActiveMonthKey();
            if (activeKey) {
                let sel = document.getElementById('monthYearSelect');
                if (sel && sel.querySelector(`option[value="${activeKey}"]`)) {
                    sel.value = activeKey; 
                }
            }
            if (document.getElementById('employeeName').value.trim() !== "") { updateTitles(); generateTable(); } else updateTitles();
        }
    };

    if (userDoc) processDoc(userDoc);
    else db.collection("users").doc(user.uid).get().then(processDoc);

    // ניהול הבאנר בתוך האפליקציה (ספירה לאחור / חסימה)
    let banner = document.getElementById('securityBanner');
    if (banner) {
        let isVerified = user.emailVerified;
        if (ENFORCE_STRICT_SECURITY) {
            if (!isVerified) {
                banner.style.display = 'block';
                banner.className = 'danger-banner';
                banner.innerHTML = `⚠️ <b>גישה הוגבלה:</b> עליך לאמת את כתובת המייל שלך כדי להשתמש בפקדי המערכת. <a href="#" onclick="window.resendVerify()">לחץ כאן לשליחת מייל אימות</a>`;
                if(window.enableControls) window.enableControls(false);
            } else {
                banner.style.display = 'none';
                if(window.enableControls) window.enableControls(true);
            }
        } else {
            if (!isVerified) {
                let daysLeft = Math.ceil((SECURITY_DEADLINE.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                banner.style.display = 'block';
                banner.className = 'warning-banner';
                banner.innerHTML = `⚠️ <b>עדכון אבטחה למשתמשים קיימים יחול בעוד ${daysLeft} ימים.</b> עליך לאמת את חשבונך כדי למנוע חסימה עתידית. <a href="#" onclick="window.resendVerify()">לשליחת מייל אימות</a>`;
            } else {
                banner.style.display = 'none';
            }
            if(window.enableControls) window.enableControls(true);
        }
    }
};

window.resendVerify = function() { 
    if(firebase.auth().currentUser) {
        firebase.auth().currentUser.sendEmailVerification().then(() => { customAlert("לינק לאימות נשלח שוב לכתובת המייל שלך!"); }).catch(e => customAlert("שגיאה בשליחת מייל: " + e.message)); 
    }
};

window.enableControls = function(enable) { 
    ['btnSaveCloud', 'exportExcelBtn', 'closeMonthBtn'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.disabled = !enable;
    });
};

window.updateOldPassword = function() {
    let newPass = document.getElementById('forcePassword').value;
    let newPassConfirm = document.getElementById('forcePasswordConfirm').value;
    let errEl = document.getElementById('forceError');
    if (!isStrong(newPass)) { 
        if(errEl) { errEl.innerText = "הסיסמה החדשה עדיין אינה עומדת בכל התנאים."; errEl.style.display = "block"; }
        else customAlert("הסיסמה אינה עומדת בתנאים.");
        return; 
    }
    if (newPass !== newPassConfirm) { 
        if(errEl) { errEl.innerText = "הסיסמאות אינן תואמות. הקלד שוב."; errEl.style.display = "block"; }
        else customAlert("הסיסמאות אינן תואמות.");
        return; 
    }
    showLoading(true);
    firebase.auth().currentUser.updatePassword(newPass).then(() => {
        return db.collection("users").doc(firebase.auth().currentUser.uid).set({ hasStrongPassword: true }, { merge: true });
    }).then(() => { 
        showLoading(false); 
        window.windowTypedPassword = null;
        customAlert("הסיסמה שונתה בהצלחה!"); 
        window.enterMainApp(firebase.auth().currentUser); 
    }).catch(e => { 
        showLoading(false); 
        if(errEl) { errEl.innerText = "שגיאה בעדכון הסיסמה: " + e.message; errEl.style.display = "block"; }
        else customAlert("שגיאה בעדכון הסיסמה: " + e.message);
    });
};

firebase.auth().onAuthStateChanged(function(user) {
    if (window.isBypassed) return; 
    
    if (user) {
        if (window.isRegisteringNewUser) { showLoading(false); window.enterMainApp(user); return; }
        
        db.collection("users").doc(user.uid).get().then(doc => {
            let hasStrongPwd = doc.exists && doc.data().hasStrongPassword === true;
            
            if (ENFORCE_STRICT_SECURITY && !hasStrongPwd) {
                if (window.windowTypedPassword) {
                    showLoading(false); 
                    if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'none'; 
                    if(document.getElementById('forcePasswordScreen')) document.getElementById('forcePasswordScreen').style.display = 'flex'; 
                } else {
                    firebase.auth().signOut(); showLoading(false); customAlert("עקב שדרוג תקני האבטחה, נותקת מהמערכת. אנא התחבר מחדש לעדכון סיסמה.");
                }
            } else {
                showLoading(false); window.windowTypedPassword = null; window.enterMainApp(user, doc);
            }
        });
    } else {
        if (maintenanceOverlay && maintenanceOverlay.style.display !== 'flex') {
            if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'flex'; 
            if(document.getElementById('forcePasswordScreen')) document.getElementById('forcePasswordScreen').style.display = 'none';
        }
        if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').style.display = 'none';
    }
});

window.logoutUser = async function() {
    if (document.getElementById('employeeName') && !document.getElementById('employeeName').value.trim() && !window.isBypassed) { customAlert("חובה להזין שם עובד לפני ההתנתקות."); return; }
    window.isBypassed = false; window.isScreenLocked = false; window.lockedEmail = null; window.isTesterMode = false;
    if(document.getElementById('authScreen')) document.getElementById('authScreen').style.display = 'flex'; 
    if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').style.display = 'none';
    firebase.auth().signOut().then(() => { if(window.clearData) window.clearData(true); }).catch(() => { if(window.clearData) window.clearData(true); });
};

window.idleTime = 0; window.isScreenLocked = false; window.lockedEmail = null;
function resetIdleTime() { window.idleTime = 0; }
function initIdleTimer() {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => document.addEventListener(evt, resetIdleTime));
    setInterval(function() {
        var user = firebase.auth().currentUser;
        if ((user || window.isBypassed) && !window.isScreenLocked) {
            window.idleTime++;
            if (window.idleTime >= 15) {
                window.isScreenLocked = true;
                if (user) { window.lockedEmail = user.email; firebase.auth().signOut().catch(e=>{}); } else if (window.isBypassed) { window.lockedEmail = "bypass"; window.isBypassed = false; }
                let aScreen = document.getElementById('authScreen');
                if(aScreen) aScreen.style.display = 'flex'; 
                let lBtn = document.getElementById('logoutBtn');
                if(lBtn) lBtn.style.display = 'none';
                customAlert("המסך ננעל אוטומטית עקב 15 דקות ללא פעילות.<br><b>הנתונים נשמרו על המסך!</b><br><br>הזן סיסמה כדי להמשיך."); resetIdleTime();
            }
        } else if (!user && !window.isBypassed && !window.isScreenLocked) window.idleTime = 0;
    }, 60000); 
}
window.onload = function() { try { if(window.clearData && !firebase.auth().currentUser && !window.isBypassed) window.clearData(true); } catch(e) {} initIdleTimer(); };

