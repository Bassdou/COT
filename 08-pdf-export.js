/* COT System Version: V202611021012 */
// קובץ: 08-pdf-export.js
// ייצוא ישיר לקובץ PDF - לא תלוי בדפדפן/מדפסת של המשתמש, בניגוד להדפסה (Ctrl+P).
//
// הגרסה הזו בנויה במבנה הדומה לדוח הפיצול האמיתי של מחלקת השכר (שחור-לבן, שורות צפופות, אותו
// סדר עמודות, כותרת "לתקופה: MM/YYYY" ושורת סיכום בתחתית) - לא עוד צילום מסך של הטבלה הצבעונית
// החיה של COT. זה מחליף את הגרסה הקודמת, לא מתווסף לצידה.
//
// חשוב: jsPDF לבדו לא יודע לצייר טקסט עברי בכלל (הגופנים המובנים שלו - helvetica/times/courier -
// הם לטיניים בלבד, ואין ל-jsPDF תמיכה מובנית בכיווניות RTL). לכן גם כאן, כמו בניסיון המקורי,
// בונים תבנית HTML נפרדת (לא את הטבלה החיה), מצלמים אותה עם html2canvas (הדפדפן מצייר את
// העברית נכון, לא jsPDF), ומטביעים את ה"צילום" כתמונה בתוך קובץ ה-PDF. המחיר המודע: הטקסט בקובץ
// שנוצר אינו ניתן לסימון/חיפוש, כי זו תמונה.

window.exportToPDF = async function() {
    if (typeof window.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
        return customAlert("ספריית ה-PDF עדיין לא נטענה. ודא שיש חיבור לאינטרנט ונסה שוב.");
    }
    var tc = document.getElementById('tableContainer');
    if (!tc || tc.style.display === 'none') return customAlert("אין גליון פתוח לייצוא.");

    var ym = getSelectedMonthYear();
    var empNameEl = document.getElementById('employeeName');
    var empName = empNameEl ? empNameEl.value.trim() : 'ללא שם';

    function getVal(id) {
        var el = document.getElementById(id);
        var v = el ? parseFloat(el.getAttribute('data-val') || 0) : 0;
        return v === 0 ? '' : v.toFixed(2);
    }

    var pctCols = columnsData.map(function(c) { return c.id; }); // I,I2,J,K,L,M,N,O,P,Q,R,S,T,U,V,W - אותו סדר שכבר קיים בחישוב של COT
    var pctLabels = { I: 'תקן', I2: 'רגילות', J: '100%', K: '125%', L: '150%', M: '175%', N: '200%', O: '180%', P: '187.5%', Q: '225%', R: '250%', S: '20%', T: '50%', U: '75%', V: '87.5%', W: '100%' };

    var rowsHtml = '';
    for (var r = 1; r <= 31; r++) {
        var tr = document.querySelector('#tbody tr:nth-child(' + r + ')'); if (!tr) continue;
        var shift = tr.querySelector('.shift-type-input')?.value || '';
        var times = tr.querySelectorAll('.time-input');
        var start = times[0]?.value || '', end = times[1]?.value || '';
        var descEl = document.getElementById('val-desc-' + r);
        var desc = descEl ? descEl.innerText.trim() : '';
        if (!shift && !start && !end && !desc) continue; // יום ריק לגמרי - לא נכלל, כמו בדוח האמיתי
        var dayNum = new Date(ym.y, ym.m - 1, r).getDay();
        rowsHtml += '<tr>' +
            '<td style="padding:1px 4px;">' + pad2(r) + '</td>' +
            '<td style="padding:1px 4px;">' + daysHebrew[dayNum] + '</td>' +
            '<td style="padding:1px 4px;" dir="ltr">' + (start || '') + '</td>' +
            '<td style="padding:1px 4px;" dir="ltr">' + (end || '') + '</td>' +
            '<td style="padding:1px 4px;max-width:90px;overflow:hidden;">' + desc + '</td>' +
            '<td style="padding:1px 4px;">' + getVal('val-total-hours-' + r) + '</td>' +
            '<td style="padding:1px 4px;">' + getVal('val-shabbat-hours-' + r) + '</td>' +
            pctCols.map(function(c) { return '<td style="padding:1px 4px;">' + getVal('val-' + c + '-' + r) + '</td>'; }).join('') +
            '</tr>';
    }
    if (rowsHtml === '') return customAlert("אין נתונים בגליון הנוכחי לייצוא.");

    var summaryHtml = '<tr style="font-weight:700;border-top:1.5px solid #000;">' +
        '<td colspan="5" style="padding:2px 4px;">סה"כ שעות:</td>' +
        '<td style="padding:2px 4px;">' + (document.getElementById('sum-hours-totalShift')?.innerText || '') + '</td>' +
        '<td style="padding:2px 4px;">' + (document.getElementById('sum-hours-shabbat')?.innerText || '') + '</td>' +
        pctCols.map(function(c) { return '<td style="padding:2px 4px;">' + (document.getElementById('sum-hours-' + c)?.innerText || '') + '</td>'; }).join('') +
        '</tr>' +
        '<tr style="font-weight:700;">' +
        '<td colspan="5" style="padding:2px 4px;">ערך עמודה:</td>' +
        '<td></td><td></td>' +
        pctCols.map(function(c) { return '<td style="padding:2px 4px;">' + (document.getElementById('sum-cost-' + c)?.innerText || '') + '</td>'; }).join('') +
        '</tr>';

    var container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;right:-9999px;background:#fff;color:#000;padding:16px;width:1000px;direction:rtl;font-family:Arial,Heebo,sans-serif;font-size:9.5px;';
    container.innerHTML =
        '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;font-size:11px;">' +
        '<span>שם עובד: ' + empName + '</span><span>לתקופה: ' + pad2(ym.m) + ' / ' + ym.y + '</span><span>תאריך הפקה: ' + new Date().toLocaleDateString('he-IL') + '</span></div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
        '<tr style="border-bottom:1.5px solid #000;font-weight:700;">' +
        '<th style="padding:2px 4px;">יום</th><th style="padding:2px 4px;"></th><th style="padding:2px 4px;">כניסה</th><th style="padding:2px 4px;">יציאה</th>' +
        '<th style="padding:2px 4px;">תאור</th><th style="padding:2px 4px;">סך שעות</th><th style="padding:2px 4px;">י.שבת</th>' +
        pctCols.map(function(c) { return '<th style="padding:2px 4px;">' + pctLabels[c] + '</th>'; }).join('') +
        '</tr>' + rowsHtml + summaryHtml + '</table>';
    document.body.appendChild(container);

    try {
        var canvas = await window.html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
        var imgData = canvas.toDataURL('image/jpeg', 0.92);

        var pageW = 842, pageH = 595; // A4 landscape, pt (72dpi)
        var margin = 20;
        var usableW = pageW - margin * 2, usableH = pageH - margin * 2;
        var ratio = Math.min(usableW / canvas.width, usableH / canvas.height);
        var imgW = canvas.width * ratio, imgH = canvas.height * ratio;

        var doc = new window.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.addImage(imgData, 'JPEG', (pageW - imgW) / 2, margin, imgW, imgH);
        doc.save("COT_משמרות_" + empName.replace(/\s+/g, '_') + "_" + ym.y + "-" + pad2(ym.m) + ".pdf");
        customAlert("קובץ ה-PDF נוצר והורד למחשב שלך בהצלחה!");
    } catch (err) {
        console.error("PDF export failed:", err);
        customAlert("שגיאה ביצירת קובץ ה-PDF.");
    } finally {
        document.body.removeChild(container);
    }
};
