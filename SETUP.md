# Smart Budget — Setup Guide

## 1. Install Node.js
Download and install from: https://nodejs.org (choose LTS version)

## 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

## 3. Configure Firebase
- Go to https://console.firebase.google.com
- Create a new project
- Add a Web app
- Copy the config into `src/firebase.js`
- Enable **Firestore Database** (start in test mode)
- Enable **Authentication → Anonymous**

## 4. Run the app
```
npm run dev
```
Then open http://localhost:5173 on your phone (same WiFi network)

## 5. Build for production
```
npm run build
```
Deploy the `dist/` folder to Firebase Hosting, Vercel, or Netlify.

---

## Features
- 💰 Income & Expense tracking with categories
- 🔄 Recurring expenses (electricity, water, car…)
- 📊 Monthly summary with category breakdown
- 🛒 Supermarket shopping list with cart total
- 🔔 Browser notifications reminder
- 🌍 Hebrew / English with full RTL support
- 👫 Partner sharing via invite code (Firebase)
- 📱 iOS-style design, works on Safari & Chrome mobile
