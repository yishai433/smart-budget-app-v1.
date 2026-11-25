# תקציב חכם - ניסוי Expo (React Native)

תיקיית ניסוי בתוך הריפו. היא **לא** משפיעה על האתר הקיים ולא על הפריסה שלו.

המבנה משקף את `src/` של האתר:

| האתר (`src/`) | כאן (`expo-app/src/`) | מצב |
|---|---|---|
| `pages/` | `pages/` | שלד: 4 לשוניות, בלי תוכן אמיתי |
| `components/` | `components/` | `Screen`, `Card` |
| `utils/` | `utils/` | הועתקו הקבצים שאינם תלויים בדפדפן: `format`, `months`, `split`, `recurring`, `insights`, `guessCategory`, `suggestCategory`, `alerts`, `invites`, `emailVerify` |
| `i18n/` | `i18n/` | אותם קובצי `he.json` / `en.json` |
| `firebase.js` | `firebase.js` | גרסת React Native (AsyncStorage) לאותו פרויקט |
| `index.css` | `theme.js` | אותה פלטת צבעים, בהירה וכהה |
| `contexts/AppContext.jsx` | עוד לא הועבר | |

## הרצה
```
cd expo-app
npm install
npx expo install --fix     # מיישר גרסאות לגרסת Expo
cp .env.example .env       # ממלאים את ערכי Firebase
npx expo start --tunnel    # סורקים את ה-QR עם Expo Go באייפון
```

## עוד לא הועבר
כניסה (Auth), AppContext, כל המסכים עצמם, סריקת ברקוד (expo-camera), השוואת סל (`priceIndex.js` צריך AsyncStorage במקום IndexedDB), גרפים (recharts לא קיים ב-RN), אווטארים (dicebear), התראות Push.
