/* COT System Version: V202610310345 */
// קובץ: 00-core.js
// הגדרות גלובליות, חיבור Firebase ומצב משותף. נטען ראשון, לפני כל שאר קבצי COT.

const SECURITY_DEADLINE = new Date("2026-11-15T00:00:00");
const ENFORCE_STRICT_SECURITY = new Date() >= SECURITY_DEADLINE;

window.carryOverData = {};
window.monthlyBalances = {}; 
const MINIMUM_ESHEL_RATE = 52.66; 

window.isDialogOpen = false; // משתנה גלובלי לזיהוי הודעה פתוחה

const firebaseConfig = {
    apiKey: "AIzaSyDzcW_tXO08BxmWki2Imx6sxq_4YKyxBLQ",
    authDomain: "cot2026.firebaseapp.com",
    projectId: "cot2026",
    storageBucket: "cot2026.firebasestorage.app",
    messagingSenderId: "187692524237",
    appId: "1:187692524237:web:6127236e55a6a763dc3f84"
};
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

function showLoading(show) { document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none'; }

