# שרת ביתי לתקציב חכם

שירות קטן שרץ אצלך בבית ב-Docker. הוא **מתחבר החוצה** ל-Firebase (לא פותחים פורטים בנתב),
מקשיב להוצאות חדשות ושולח התראות לטלפונים של כל בני הבית:

- **הוצאה גדולה**: הסכום נקבע לחשבון (משותף או לא) באפליקציה, בהגדרות ← התראות מהשרת הביתי. כשהוצאה מגיעה אליו או עוברת אותו, ההתראה נשלחת לשאר בני החשבון. מי שרשם לא מקבל (בחשבון של אדם אחד, הוא מקבל).
- **תקציב**: התקרבות ל-80% וחריגה מ-100%, של הקטגוריה ושל התקציב החודשי. נשלחת פעם אחת לכל רמה בכל חודש.

## התקנה

### 1. מפתח שירות (פעם אחת)
Firebase Console ← גלגל השיניים ← **Project settings** ← **Service accounts** ← **Generate new private key**.
שמור את הקובץ בשם `firebase-key.json` בתוך תיקיית `server/` בשרת. **אל תעלה אותו ל-GitHub ואל תשלח אותו לאף אחד.**

### 2. מפתח VAPID לאפליקציה (פעם אחת)
Firebase Console ← **Project settings** ← **Cloud Messaging** ← **Web Push certificates** ← **Generate key pair**.
מעתיקים את המפתח הציבורי (מחרוזת ארוכה) ושומרים ב-GitHub:
Settings ← Secrets and variables ← Actions ← New repository secret, בשם `VITE_FIREBASE_VAPID_KEY`.
אחרי זה מריצים מחדש את ה-deploy (Actions ← Deploy ← Re-run).

### 3. כללי האבטחה
מדביקים את `firestore.rules` מהריפו ב-Firebase Console ← Firestore ← Rules ← **Publish**.

### 4. הפעלה בשרת
```bash
git clone https://github.com/yishai433/smart-budget-app-v1..git
cd smart-budget-app-v1./server
# מעתיקים לכאן את firebase-key.json
docker compose up -d --build
docker compose logs -f
```
בלוג אמורה להופיע השורה "מאזין להוצאות חדשות".

### 5. באפליקציה
הגדרות ← **התראות מהשרת הביתי** ← הפעל ← **שלח בדיקה**.
באייפון: קודם "הוסף למסך הבית" ופותחים משם.

## עדכון
```bash
git pull && docker compose up -d --build
```

## כוונון (בקובץ docker-compose.yml)
- `UNUSUAL_MIN`: ברירת המחדל לחשבון שעוד לא קבע סכום (150)

## בדיקות
`npm test` (הלוגיקה של חריגות ותקציב, בלי Firebase).
