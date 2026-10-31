/* COT System Version: V202610310155 */
// קובץ: content-loader.js
// טוען את תוכן חלונות ה"מידע" מהקבצים החיצוניים שב-content/ ומזריק אותם לתוך המכלים שב-components.js.
// כך אפשר לעדכן את תוכן ההדרכה בלי לגעת בקוד ובלי להעלות גרסה חדשה.
// יש להריץ את האפליקציה דרך שרת (GitHub Pages, או שרת מקומי) ולא ע"י פתיחת index.html ישירות מהדיסק (file://),
// אחרת הדפדפן יחסום את הבקשה מטעמי אבטחה - בדיוק כמו טעינת version.json הקיימת.

async function loadContentInto(url, containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    try {
        var res = await fetch(url + '?t=' + new Date().getTime());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        el.innerHTML = await res.text();
    } catch (err) {
        console.error('טעינת תוכן נכשלה (' + url + '):', err);
        el.innerHTML = '<p style="color:#c0392b;">שגיאה בטעינת התוכן. ודא שהאפליקציה רצה משרת (לא מקובץ מקומי), ושקובץ ' + url + ' קיים.</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadContentInto('content/shift-info.he.html', 'shiftInfoContent');
    loadContentInto('content/mini-shift-info.he.html', 'miniShiftInfoContent');
});
