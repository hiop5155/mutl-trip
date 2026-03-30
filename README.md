# ✈️ 多行程旅行管理系統 (Multi-Trip Planner)

這是一個基於 **React + Vite** 開發的私人專屬多行程旅行管理系統。透過結合 Firebase 即時資料庫 (Realtime Database)，除了達成**多人跨裝置即時共編**的魔法之外，更實作了 **Google Auth 信箱白名單機制**，保障所有的行程與記帳資料不被外人窺探！

## 🌟 主要特色與功能
- 🔐 **私人白名單保護**：整合 Firebase 驗證，只有預先設定在 `ALLOWED_EMAILS` 的 Google 信箱可以成功登入。
- 🌍 **動態行程 Dashboard**：可同時管理無限多個進行中或過去的旅行計畫。
- 🗓️ **自動排程生成**：建立旅行時自訂出發/回程日，系統會自動生成天數，每一天皆可動態新增/調整地點與時間紀錄。
- ✈️ **機票與住宿面板**：專屬的航班與 Airbnb/飯店住宿卡片，方便抵達機場或報到時快速查閱。
- 💰 **即時匯率動態記帳表**：內建記帳工具，自動即時抓取當地貨幣對台幣之匯率，支援**平分**與**自己出**的結算邏輯，讓分帳不再頭痛。

## 🚀 技術棧
- **Frontend**: React.js, Vite
- **Database**: Firebase Realtime Database
- **Auth**: Firebase Authentication (Google OAuth)
- **Hosting**: Firebase Hosting

## 🛠️ 環境設定與啟動

### 1. 安裝套件
```bash
npm install
```

### 2. 環境變數設定
請在專案根目錄建立 `.env` 檔案，並從您的 Firebase Console 取出對應數值填寫：
```env
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_DATABASE_URL=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```
*(注意：`.env` 已經被加入 `.gitignore` 保護，切勿將這些金鑰 commit 至公開的版控庫。)*

### 3. 本地開發
啟動本地端伺服器 (Localhost)：
```bash
npm run dev
```

### 4. 產品部署
只需兩行指令，編譯打包並發布至 Firebase Hosting 讓全世界看見：
```bash
npm run build
firebase deploy
```
