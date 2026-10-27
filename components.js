// קובץ רכיבים וחלונות רקע: components.js

const cotStaticComponents = `
<!-- מסך תחזוקה מתפרץ (נשלט מהענן) -->
<div id="maintenanceOverlay" class="full-screen-overlay" style="display:none; z-index: 99999;">
    <div style="background:#fff; padding:40px; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.2); text-align:center; max-width:400px; width: 100%;">
        <div style="font-size: 60px; margin-bottom: 15px;">👨‍💻</div>
        <h2 style="color:#d35400; margin-top:0; font-size:22px; font-weight:bold; line-height:1.4;">המערכת משתדרגת, בזמן הקרוב תעלה מערכת יותר עדכנית.</h2>
        <p style="color:#34495e; font-size:18px; font-weight:bold; margin-top:15px; margin-bottom:0;">נחזור לפעילות בקרוב</p>
    </div>
</div>

<!-- חלון מידע כללי והוראות הפעלה -->
<div id="shiftInfoModal" class="modal" style="z-index: 20000;">
    <div class="modal-content" style="max-width: 800px; padding: 30px;">
        <span class="close-btn" onclick="closeShiftInfo()">&times;</span>
        <div class="modal-header">
            <h2 style="font-size: 24px; color: #0d47a1;">ℹ️ מידע חשוב ומדריך למשתמש</h2>
        </div>
        <div style="max-height: 65vh; overflow-y: auto; padding-left: 15px; font-size: 14.5px; line-height: 1.6; color: #34495e;">
            <h3 style="color: #1565c0; font-size: 18px; margin-top: 0;">מבוא: למה נועדה המערכת?</h3>
            <p>מערכת <strong>COT (Calculate Over Time)</strong> פותחה במיוחד בעקבות הקושי הרב הקיים בהבנת ומעקב אחר דו"חות הפיצול המורכבים של עובדי מעברי הגבולות. חישוב תגמול המשמרות, השעות הנוספות והיתרות בסביבת העבודה הזו דורש בקיאות רבה, ולעיתים קרובות מוביל לחוסר ודאות.</p>
            <p>מטרת המערכת היא לעשות סדר, לשקף את הנתונים בצורה פשוטה, ובעיקר: <strong style="color:#d35400;">לאפשר לך לתכנן ולאמוד את שכרך העתידי!</strong><br>באמצעות הזנת המשמרות המתוכננות שלך מראש, תוכל לראות בזמן אמת את אומדן ערך השעות הנוספות, לבקר את יתרות החופש שלך, ולדעת לקראת מה אתה הולך לקראת סוף החודש – בלי הפתעות בתלוש השכר.</p>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #1976d2; margin-top: 20px;">
                <h3 style="margin-top: 0; color: #1565c0; font-size: 17px; margin-bottom: 10px;">🌟 במה המערכת מיוחדת?</h3>
                <ul style="margin: 0; padding-right: 20px;">
                    <li><strong>התאמה מלאה להסכמי נציבות שירות המדינה:</strong> המערכת מזהה אוטומטית חגים, ערבי חג, ימי בחירה וימי חופשה הסכמיים. היא יודעת לחשב נכון את שעות התקן בערבי חג במיוחד לעובדי משמרות.</li>
                    <li><strong>בקרה שבועית ומשמרות נגררות:</strong> המערכת מונעת חריגות. היא עוקבת אחרי שבועות קלנדריים ויודעת "למשוך" באופן חכם משמרות שבוצעו בסוף החודש הקודם. חרגת מ-5 משמרות בשבוע? המערכת תזהיר אותך מיד.</li>
                    <li><strong>סנכרון ענן חכם ובקרת סתירות:</strong> היתרות שלך מגובות אוטומטית. הפאנל העליון תמיד מציג את היתרות העדכניות ביותר. אם תנסה לטעון קובץ ישן עם יתרות שלא תואמות את הנתונים העדכניים בענן, המערכת תזהה את הסתירה ותתריע בפניך לתקן זאת.</li>
                    <li><strong>אבטחה ונעילת מסך אוטומטית:</strong> מטעמי פרטיות, אם המערכת תזהה חוסר פעילות במשך 15 דקות, המסך יינעל אוטומטית. אל דאגה - הנתונים שלך לא נמחקים! הקלדת הסיסמה מחדש תשחרר את הנעילה ותחזיר אותך בדיוק לנקודה בה עצרת.</li>
                    <li><strong>ניהול יתרות אוטומטי ("סגירת חודש"):</strong> בסיום החודש, לחיצה אחת מעבירה את יתרות הסגירה שצברת להיות יתרות הפתיחה של החודש הבא, ושומרת הכל לענן בבטחה.</li>
                </ul>
            </div>

            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-right: 4px solid #e67e22;">
                <h3 style="margin-top: 0; color: #d35400; font-size: 17px; margin-bottom: 10px;">💡 טיפים של COT לתכנון שכר נבון</h3>
                <ul style="margin: 0; padding-right: 20px;">
                    <li><strong>תוספת משמרת צהריים:</strong> שים לב - כדי לקבל תוספת משמרת צהריים/ערב (החל מהשעה 14:00), עליך לעבוד <strong>לפחות 3 שעות רצופות</strong> בתוך טווח השעות המזכה. משמרת שתסתיים מוקדם מדי לא תזכה אותך בתוספת!</li>
                    <li><strong>חפיפת שעות לילה:</strong> משמרת תיחשב כ"משמרת לילה" מזכה רק אם עבדת לפחות <strong>שעתיים</strong> בתוך הטווח המוגדר כלילה (בין 22:00 ל-06:00).</li>
                </ul>
                <div style="margin-top: 15px; padding: 10px; background: #fdebd0; border-radius: 6px; border: 1px solid #f5b041;">
                    <strong style="color: #c0392b;">⚠️ החתמת יציאה מוקדמת – סכנה להפסד שכר!</strong><br>
                    החתמת יציאה לפני תום המשמרת עלולה לפגוע בזכאותך לתוספות שכר משמעותיות, גם בגלל דקות בודדות. לדוגמה: במשמרת בוקר מאוחרת (06:00-17:00), עליך לצבור <strong>לפחות 3 שעות</strong> בטווח משמרת הצהריים (14:00-17:00) כדי לקבל את התוספת (20%). החתמת יציאה ב-16:59 תגרום לכך שלא תצבור 3 שעות מלאות, ותפסיד לחלוטין את תוספת המשמרת! בנוסף, הדבר עשוי להקטין את תגמול האש"ל היומי שלך. הקפד על החתמה בזמני המשמרת המוגדרים.
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #1565c0; font-size: 17px; border-bottom: 2px solid #bbdefb; padding-bottom: 5px;">🛠️ הוראות הפעלה ועבודה שוטפת</h3>
                
                <h4 style="margin-bottom: 5px; color: #2c3e50;">שלב א': כניסה והגדרות יתרות (חשוב!)</h4>
                <ul style="padding-right: 20px; margin-top: 5px;">
                    <li><strong>כניסה למערכת:</strong> היכנס באמצעות האימייל והסיסמה שבחרת (להרשמה פעל עפ"י ההנחיות במסך הפתיחה). מיד לאחר ההתחברות, המערכת תשלוף מהענן ותציג בפאנל העליון את היתרות של החודש האחרון שעודכן.</li>
                    <li><strong>הגדרות בסיס:</strong> ודא ששמך, תעריף שעת הבסיס ותעריף האש"ל מעודכנים.</li>
                    <li><strong>הזנת יתרות או תיקון:</strong> היתרות מוגנות משינויים מקריים על ידי סמלי מנעול. כדי להזין או לתקן יתרות, גלול לכרטיסיות היתרות, לחץ על סמלי המנעול (🔒) כדי לפתוח אותן לעריכה, הזן את המספרים הנכונים ולחץ "שמור גליון" לאישור לענן.</li>
                </ul>

                <h4 style="margin-bottom: 5px; color: #2c3e50;">שלב ב': הזנת משמרות מהירה</h4>
                <ul style="padding-right: 20px; margin-top: 5px;">
                    <li><strong>קודי משמרת להקלדה מהירה:</strong> אין צורך להקליד שעות! פשוט הקלד קוד משמרת בתיבת ה"תאור" (כמו <code>ב06</code>, <code>227</code>, <code>102</code> או קודי היעדרות כמו <code>ח</code>, <code>מיל</code>), והשעות יתמלאו אוטומטית. <strong>לא זוכר את הקוד? לחץ על המילה "משמרת" (עם סמל ה-i) בכותרת הטבלה, ורשימת הקודים המלאה והמעודכנת תקפוץ מיד מולך.</strong></li>
                    <li><strong>הזנת היעדרויות חכמה:</strong> הקלדת קוד היעדרות תמלא אוטומטית 8 שעות בעמודות התקן וסה"כ השעות, שיסומנו ב<strong>צבע סגול מודגש</strong> להבדלה מהירה. המערכת גם <strong>תחסום</strong> הזנת היעדרויות (כולל <code>חש</code>) בימי מנוחה (שישי ושבת) למניעת טעויות, למעט מילואים (<code>מיל</code>).</li>
                    <li><strong>הקלדה רצופה:</strong> מעדיף להקליד שעות ידנית? פשוט הקלד רצף מספרים (למשל <code>1530</code>) והמערכת תהפוך זאת ל-<code>15:30</code>.</li>
                    <li><strong>ניווט חכם וזריז:</strong> הקש <code>Enter</code> כדי לעבור משעת הכניסה לשעת היציאה. הקשה נוספת תעביר אותך אוטומטית לשעת הכניסה של היום הבא. לחיצה על <code>Esc</code> תבטל הקלדה שגויה.</li>
                </ul>

                <h4 style="margin-bottom: 5px; color: #2c3e50;">שלב ג': בקרת הדו"ח, סגירת חודש וייצוא נתונים</h4>
                <ul style="padding-right: 20px; margin-top: 5px;">
                    <li><strong>לוח סיכומים:</strong> בתחתית המסך תמצא את הנתונים החשובים: סך משמרות, אש"ל, ואת <strong>אומדן ערך השעות הנוספות</strong> (₪).</li>
                    <li><strong>סגירת חודש:</strong> סיימת את החודש והדו"ח תקין? לחץ על כפתור <strong>"סגור חודש"</strong>. המערכת תגלגל אוטומטית את היתרות, תשמור אותן בענן, ותכין עבורך גיליון נקי.</li>
                    <li><strong>ייצוא לאקסל:</strong> לחיצה על כפתור "ייצא לאקסל" תפתח חלון בחירה בו תוכל להחליט האם להפיק <strong>קובץ אקסל חדש</strong>, או לשתול גיליון נוסף בתוך <strong>קובץ אקסל קיים</strong> (למעקב שנתי לדוגמה). המערכת תבנה גיליון מעוצב ומסודר אוטומטית! (ניתן גם להפיק PDF ע"י לחיצה על כפתור ההדפסה).</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0 10px 0; background: #f8fbff; padding: 20px; border-radius: 12px; border: 2px dashed #90caf9;">
                <h3 style="margin-top: 0; color: #1976d2; font-size: 18px;">📚 ספרון הדרכה ומידע מקצועי</h3>
                <p style="font-size: 14.5px; margin-bottom: 15px; color: #546e7a;">להורדת המדריך המלא כקובץ PDF לקריאה נוחה או הדפסה, לחץ על הכפתור מטה:</p>
                <a href="cot_user_manual.pdf" download="מדריך_למשתמש_COT.pdf" class="btn-3d" style="background-color: #1976d2; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px #1565c0;">
                    📥 הורד ספרון הדרכה למשתמש (PDF)
                </a>
            </div>
        </div>
    </div>
</div>

<!-- חלון קודי משמרות -->
<div id="miniShiftInfoModal" class="modal" style="z-index: 20000;">
    <div class="modal-content" style="max-width: 420px; padding: 18px;">
        <span class="close-btn" onclick="closeMiniShiftInfo()">&times;</span>
        <div class="modal-header"><h2 style="font-size: 18px; margin: 0; color: #0d47a1;">ℹ️ קודי משמרות להקלדה מהירה</h2></div>
        <div style="max-height: 55vh; overflow-y: auto;">
            <table class="info-table" style="font-size: 13px;">
                <thead><tr><th style="width: 25%;">קוד</th><th style="width: 20%;">כניסה</th><th style="width: 20%;">יציאה</th><th>תאור</th></tr></thead>
                <tbody>
                    <tr><td><span class="code-badge">ב</span></td><td>07:00</td><td>19:00</td><td>בוקר 12 שעות</td></tr>
                    <tr><td><span class="code-badge">ל</span></td><td>19:00</td><td>07:00</td><td>לילה 12 שעות</td></tr>
                    <tr><td><span class="code-badge">615</span></td><td>06:00</td><td>15:00</td><td>בוקר מוקדמת</td></tr>
                    <tr><td><span class="code-badge">616</span></td><td>06:00</td><td>16:00</td><td>בוקר רגילה</td></tr>
                    <tr><td><span class="code-badge">617</span></td><td>06:00</td><td>17:00</td><td>בוקר מאוחרת</td></tr>
                    <tr><td><span class="code-badge">ב06</span></td><td>07:00</td><td>18:00</td><td>בוקר מוארכת</td></tr>
                    <tr><td><span class="code-badge">ב16</span></td><td>07:00</td><td>16:00</td><td>בוקר מקוצרת</td></tr>
                    <tr><td><span class="code-badge">102</span></td><td>10:00</td><td>20:00</td><td>צהריים</td></tr>
                    <tr><td><span class="code-badge">111</span></td><td>11:00</td><td>20:00</td><td>צהריים מאוחרת</td></tr>
                    <tr><td><span class="code-badge">112</span></td><td>11:00</td><td>22:15</td><td>ערב</td></tr>
                    <tr><td><span class="code-badge">132</span></td><td>13:00</td><td>22:15</td><td>ערב מאוחרת</td></tr>
                    <tr><td><span class="code-badge">207</span></td><td>20:00</td><td>07:00</td><td>לילה מוקדמת</td></tr>
                    <tr><td><span class="code-badge">217</span></td><td>21:00</td><td>07:00</td><td>לילה רגילה</td></tr>
                    <tr><td><span class="code-badge">227</span></td><td>22:00</td><td>07:00</td><td>לילה מאוחרת</td></tr>
                    <tr><td><span class="code-badge">228</span></td><td>22:00</td><td>08:00</td><td>לילה ארוכה</td></tr>
                    <tr><td><span class="code-badge">ח</span></td><td>-</td><td>-</td><td>חופש רגיל</td></tr>
                    <tr><td><span class="code-badge">חש</span></td><td>-</td><td>-</td><td>חופש שבת</td></tr>
                    <tr><td><span class="code-badge">מח</span></td><td>-</td><td>-</td><td>מחלה</td></tr>
                    <tr><td><span class="code-badge">מיל</span></td><td>-</td><td>-</td><td>מילואים</td></tr>
                    <tr><td><span class="code-badge">הצ</span></td><td>-</td><td>-</td><td>הצהרה</td></tr>
                    <tr><td><span class="code-badge">בח</span></td><td>-</td><td>-</td><td>בחירה</td></tr>
                    <tr><td><span class="code-badge">מבמ</span></td><td>-</td><td>-</td><td>מחלת בן משפחה</td></tr>
                    <tr><td><span class="code-badge">הס</span></td><td>-</td><td>-</td><td>עפ"י הסכם</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- חלון הזנת משמרות נגררות -->
<div id="firstMonthCarryModal" class="modal" style="z-index: 25000;">
    <div class="modal-content" style="max-width: 400px; text-align: center; padding: 30px;">
        <h3 style="color: #d35400; margin-top: 0; font-size: 20px;">הזנת משמרות מסוף חודש שעבר</h3>
        <p style="font-size: 14px; color: #34495e; line-height: 1.6; margin-bottom: 20px;">
            למעקב 5 משמרות בשבוע, אנא הקלד כמות המשמרות שנקלטו השבוע בדו"ח של החודש הקודם
            <br><span id="carryMaxInfo" style="font-weight:bold; color:#e74c3c;"></span>
        </p>
        <input type="number" id="manualCarryInput" value="0" min="0" max="6" style="width: 80px; padding: 10px; font-size: 20px; font-weight: bold; text-align: center; border: 2px solid #e3f2fd; border-radius: 8px; margin-bottom: 20px; outline: none;">
        <br>
        <button class="btn-3d" onclick="saveFirstMonthCarry()" style="background-color: #d35400; color: white; padding: 12px 25px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px #a04000;">שמור והתחל לעבוד</button>
    </div>
</div>

<!-- חלון בחירת סוג ייצוא לאקסל -->
<div id="excelExportModal" class="modal" style="z-index: 25000;">
    <div class="modal-content" style="max-width: 380px; text-align: center; padding: 30px;">
        <span class="close-btn" onclick="document.getElementById('excelExportModal').style.display='none'">&times;</span>
        <h3 style="color: #0d47a1; margin-top: 0; font-size: 22px;">ייצוא נתונים לאקסל</h3>
        <p style="font-size: 15px; color: #34495e; margin-bottom: 25px;">בחר כיצד תרצה לייצא את גיליון החודש הנוכחי:</p>
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <button class="btn-3d" onclick="exportToNewExcel()" style="background-color: #27ae60; color: white; padding: 14px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px #1e8449;">📄 צור קובץ אקסל חדש</button>
            <button class="btn-3d" onclick="document.getElementById('excelExportModal').style.display='none'; document.getElementById('excelFileLoader').click();" style="background-color: #f39c12; color: white; padding: 14px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px #d68910;">📚 הוסף לקובץ אקסל קיים</button>
        </div>
    </div>
</div>

<!-- חלון קופץ מותאם אישית של COT -->
<div id="customDialogModal" class="modal" style="z-index: 25000;">
    <div class="modal-content" style="max-width: 400px; text-align: center; padding: 25px;">
        <div class="modal-header" style="border-bottom: 2px solid #1976d2; margin-bottom: 15px; padding-bottom: 10px;">
            <h2 id="customDialogTitle" style="font-size: 20px; color: #0d47a1; margin: 0;">COT says</h2>
        </div>
        <p id="customDialogMessage" style="font-size: 15px; color: #34495e; line-height: 1.5; margin-bottom: 20px; font-weight: bold;"></p>
        
        <input type="text" id="customDialogInput" style="display:none; width: 80%; padding: 10px; font-size: 16px; margin: 0 auto 20px auto; border: 2px solid #bbdefb; border-radius: 8px; text-align: center; outline: none;">
        
        <div style="display: flex; justify-content: center; gap: 15px;">
            <button id="customDialogOkBtn" class="btn-3d" style="background-color: #1976d2; color: white; padding: 10px 25px; border-radius: 8px; font-size: 15px; min-width: 90px;">אישור</button>
            <button id="customDialogCancelBtn" class="btn-3d" style="background-color: #e74c3c; color: white; padding: 10px 25px; border-radius: 8px; font-size: 15px; min-width: 90px; display: none;">ביטול</button>
        </div>
    </div>
</div>

<!-- פוטר משפטי (Footer) -->
<div class="legal-footer hide-print" style="position: fixed; bottom: 0; left: 0; width: 100%; text-align: center; padding: 10px 0; font-size: 12px; color: #546e7a; background-color: rgba(238, 245, 249, 0.95); z-index: 9999; border-top: 1px solid #bbdefb; box-shadow: 0 -2px 5px rgba(0,0,0,0.05);">
    <span style="font-weight: bold;">&copy; 2026 COT by B Systems. כל הזכויות שמורות.</span> | 
    <a href="terms.pdf" target="_blank" style="color: #1976d2; text-decoration: none; margin: 0 5px;">תקנון ותנאי שימוש</a> | 
    <a href="privacy.pdf" target="_blank" style="color: #1976d2; text-decoration: none; margin: 0 5px;">מדיניות פרטיות</a> | 
    <a href="accessibility.pdf" target="_blank" style="color: #1976d2; text-decoration: none; margin: 0 5px;">הצהרת נגישות</a>
</div>
`;

// הזרקת כל החלונות לתוך העמוד רגע לפני סגירת ה-BODY
document.body.insertAdjacentHTML('beforeend', cotStaticComponents);