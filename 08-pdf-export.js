/* COT System Version: V202610312326 */
// קובץ: 08-pdf-export.js
// ייצוא ישיר לקובץ PDF - לא תלוי בדפדפן/מדפסת של המשתמש, בניגוד להדפסה (Ctrl+P).
//
// חשוב: jsPDF לבדו לא יודע לצייר טקסט עברי בכלל (הגופנים המובנים שלו - helvetica/times/courier -
// הם לטיניים בלבד, ואין ל-jsPDF תמיכה מובנית בכיווניות RTL). הניסיון הראשון להשתמש ב-autoTable
// (שמצייר טקסט וקטורי ישירות) יצר קובץ עם עברית הפוכה לחלוטין. הפתרון: html2canvas מצלם את
// הטבלה בדיוק כפי שהיא מוצגת במסך (העברית נכונה כי זה הדפדפן עצמו שמצייר אותה, לא jsPDF), וה-
// "צילום" הזה מוטבע כתמונה בתוך קובץ ה-PDF. המחיר: טקסט לא ניתן לסימון/חיפוש בקובץ שנוצר (זו
// תמונה) - זה שיקול מודע, לא פשרה שלא שמנו לב אליה.

window.exportToPDF = async function() {
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
        return customAlert("ספריית ה-PDF עדיין לא נטענה. ודא שיש חיבור לאינטרנט ונסה שוב.");
    }
    var tc = document.getElementById('tableContainer');
    if (!tc || tc.style.display === 'none') return customAlert("אין גליון פתוח לייצוא.");

    // לכידת מצב נוכחי כדי לשחזר בסוף, גם אם קרתה שגיאה (ראו finally)
    var wasSimple = tc.classList.contains('simple-view');
    var origMaxHeight = tc.style.maxHeight, origOverflow = tc.style.overflow;

    try {
        // ב-PDF מייצאים תמיד את כל 25 העמודות, בלי קשר למצב מתג התצוגה (פשוטה/מלאה) - עקבי עם
        // ההתנהגות הקיימת בהדפסה. גם מנטרלים זמנית גלילה/הדבקה (sticky) כדי שהצילום ייצא נקי,
        // ולא יכפיל את עמודת התאריך או את שורת הכותרת.
        tc.classList.remove('simple-view');
        tc.classList.add('pdf-capturing');
        tc.style.maxHeight = 'none';
        tc.style.overflow = 'visible';

        var canvas = await window.html2canvas(tc, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        var imgData = canvas.toDataURL('image/jpeg', 0.92);

        var pageW = 842, pageH = 595; // A4 landscape, pt (72dpi)
        var margin = 20;
        var usableW = pageW - margin * 2, usableH = pageH - margin * 2;
        var ratio = Math.min(usableW / canvas.width, usableH / canvas.height);
        var imgW = canvas.width * ratio, imgH = canvas.height * ratio;

        var doc = new window.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.addImage(imgData, 'JPEG', (pageW - imgW) / 2, margin, imgW, imgH);

        var ym = getSelectedMonthYear();
        var empNameEl = document.getElementById('employeeName');
        var empName = empNameEl ? empNameEl.value.trim() : 'ללא_שם';
        doc.save("COT_משמרות_" + empName.replace(/\s+/g, '_') + "_" + ym.y + "-" + pad2(ym.m) + ".pdf");
        customAlert("קובץ ה-PDF נוצר והורד למחשב שלך בהצלחה!");
    } catch (err) {
        console.error("PDF export failed:", err);
        customAlert("שגיאה ביצירת קובץ ה-PDF.");
    } finally {
        tc.classList.remove('pdf-capturing');
        if (wasSimple) tc.classList.add('simple-view');
        tc.style.maxHeight = origMaxHeight;
        tc.style.overflow = origOverflow;
    }
};
