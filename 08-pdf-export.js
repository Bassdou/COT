/* COT System Version: V202610312313 */
// קובץ: 08-pdf-export.js
// ייצוא ישיר לקובץ PDF (jsPDF + autoTable) - לא תלוי בדפדפן/מדפסת של המשתמש, בניגוד להדפסה (Ctrl+P).
// קורא את אותם תאים (data-val) שכבר בנה calculator.js, בדיוק כמו 06-excel-export.js - לא נוגע
// בשום חישוב, רק קורא ערכים שכבר קיימים.

// בונה את גוף הטבלה (head+body בפורמט autoTable) מתוך ה-DOM. פונקציה טהורה, אפשר לבדוק בלי jsPDF בכלל.
window.buildPdfTableData = function(ym) {
    var head = [
        [
            { content: 'תאריך', colSpan: 2, rowSpan: 2 },
            { content: 'משמרת', rowSpan: 2 }, { content: 'כניסה', rowSpan: 2 }, { content: 'יציאה', rowSpan: 2 },
            { content: 'תאור', rowSpan: 2 }, { content: 'סה"כ שעות', rowSpan: 2 }, { content: 'חופש שבת', rowSpan: 2 },
            { content: 'תקן', rowSpan: 2 }, { content: 'רגילות', rowSpan: 2 },
            { content: 'ש"נ', colSpan: 3 }, { content: 'שבת', colSpan: 2 }, { content: 'ש"נ', colSpan: 4 }, { content: 'ת.מ.', colSpan: 5 },
            { content: 'ערך', rowSpan: 2 },
        ],
        ['100%', '125%', '150%', '175%', '200%', '180%', '187.5%', '225%', '250%', '20%', '50%', '75%', '87.5%', '100%'],
    ];

    var body = [];
    var getVal = function(id) {
        var el = document.getElementById(id);
        var v = el ? parseFloat(el.getAttribute('data-val') || 0) : 0;
        return v === 0 ? '' : v;
    };
    for (var r = 1; r <= 31; r++) {
        var tr = document.querySelector('#tbody tr:nth-child(' + r + ')'); if (!tr) continue;
        var dayNum = new Date(ym.y, ym.m - 1, r).getDay();
        var shiftVal = tr.querySelector('.shift-type-input')?.value || '';
        var inVal = tr.querySelectorAll('.time-input')[0]?.value || '';
        var outVal = tr.querySelectorAll('.time-input')[1]?.value || '';
        var descVal = document.getElementById('val-desc-' + r)?.innerText || '';
        if (!shiftVal && !inVal && !outVal && !descVal) continue;

        var costCell = document.getElementById('val-cost-' + r);
        var costVal = costCell ? parseFloat(costCell.getAttribute('data-cost') || 0) : 0;

        body.push([
            pad2(r), daysHebrew[dayNum], shiftVal, inVal, outVal, descVal,
            getVal('val-total-hours-' + r), getVal('val-shabbat-hours-' + r),
            getVal('val-I-' + r), getVal('val-I2-' + r),
            getVal('val-J-' + r), getVal('val-K-' + r), getVal('val-L-' + r),
            getVal('val-M-' + r), getVal('val-N-' + r),
            getVal('val-O-' + r), getVal('val-P-' + r), getVal('val-Q-' + r), getVal('val-R-' + r),
            getVal('val-S-' + r), getVal('val-T-' + r), getVal('val-U-' + r), getVal('val-V-' + r), getVal('val-W-' + r),
            costVal === 0 ? '' : costVal,
        ]);
    }
    return { head: head, body: body };
};

window.exportToPDF = async function() {
    if (typeof window.jsPDF === 'undefined' || typeof window.jsPDF.API?.autoTable === 'undefined') {
        return customAlert("ספריית ה-PDF עדיין לא נטענה. ודא שיש חיבור לאינטרנט ונסה שוב.");
    }
    var ym = getSelectedMonthYear();
    var table = window.buildPdfTableData(ym);
    if (table.body.length === 0) return customAlert("אין נתונים בגליון הנוכחי לייצוא.");

    try {
        var doc = new window.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.autoTable({
            head: table.head,
            body: table.body,
            theme: 'grid',
            styles: { font: 'helvetica', fontSize: 6.5, halign: 'center', cellPadding: 2 },
            headStyles: { fillColor: [29, 78, 137], textColor: 255, fontStyle: 'bold' },
            margin: { top: 20, left: 15, right: 15 },
        });

        var empNameEl = document.getElementById('employeeName');
        var empName = empNameEl ? empNameEl.value.trim() : 'ללא_שם';
        doc.save("COT_משמרות_" + empName.replace(/\s+/g, '_') + "_" + ym.y + "-" + pad2(ym.m) + ".pdf");
        customAlert("קובץ ה-PDF נוצר והורד למחשב שלך בהצלחה!");
    } catch (err) {
        console.error("PDF export failed:", err);
        customAlert("שגיאה ביצירת קובץ ה-PDF.");
    }
};
