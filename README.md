# ✈️ 旅行手帳系統 (Multi-Trip Planner)

基於 **React + Vite** 開發的私人多人旅行管理系統。Firebase Realtime Database 實現跨裝置即時同步，Gmail 白名單 + 行程分享機制管控存取權限。

## 功能

### Dashboard
- 建立、編輯、刪除、複製行程
- 行程複製保留成員清單，立即開啟編輯彈窗
- 目的地城市選擇（~140 城市，含繁體中文名稱 + 座標），幣值依目的地國家自動帶入
- 行程卡片顯示狀態 badge：「還有 X 天」/ 「進行中・第 X 天」/ 「已結束」
- 邀請機制：產生帶有時效性的 `#invite_token` 邀請連結，對方開啟後自動取得權限並加入成員名單

### 行程規劃
- 依出發/回程日期自動生成每日行程，每日有獨立顏色、標題（可編輯）
- 行程項目：地點名稱、時間、地圖連結（📍 直連）、類型標籤（美食/景點/購物/交通）
- 清單/時間軸 兩種視圖切換，時間軸依 startTime 排序並顯示連接線
- 拖拉（⠿）或 ▲▼ 按鈕調整同日項目順序
- 每日 header 顯示進度條 + 完成數，全完成轉綠色
- 天氣預報（Open-Meteo API）：過去行程用 archive API，近期用 forecast API，超過 16 天後不顯示

### 資訊面板
- 去程/回程航班卡片
- 住宿資訊卡片

### 隱私與記帳
- 💰 **記帳**：多幣別支援（39 種），即時匯率。包含圓餅圖與貪婪結算演算法。
  - *權限：所有成員可讀取，但「僅限該筆帳款的建立者」有權限修改或刪除，防竄改。*
- 🧳 **個人行李清單**：完全私有，利用 `privateData` 節點達到資料庫層次隔離，預設帶入護照/eSIM。
- 📝 **私人備忘錄**：完全私有，與行李清單同屬隔離保護。
- 👥 **成員列表**：email ↔ 顯示名稱對應，可退出或由建立者移除。
- 在線狀態：顯示目前同時瀏覽行程的其他成員（Firebase onDisconnect）
- 深/淺色模式 + 繁中/英文切換，偏好儲存於 `localStorage`

### 身份與權限系統
- Google OAuth 登入，支援在 App 內自訂暱稱（覆蓋 Google 顯示名稱）
- 新版以 **Creator-rooted** 架構設計：所有人皆可建立行程。
- 透過 Token 機制控管存取，受邀成員寫入 `memberIndex`
- 嚴密的資料庫權限控管 (Firebase Rules)：
  - **行程主資料 (`tripData`)**：行程建立者及成員皆可讀寫。
  - **記帳資料 (`expenses`)**：行程成員可讀取，單筆項目僅建立者可寫入。
  - **私人資料 (`privateData`)**：絕對隔離，僅限使用者本人讀寫。

## 技術棧

- **Frontend**: React 18 + Vite 5
- **Database**: Firebase Realtime Database
- **Auth**: Firebase Authentication (Google OAuth)
- **Hosting**: Firebase Hosting

## 開發

```bash
npm install
npm run dev      # localhost:5173
npm run build
firebase deploy
```

### 環境變數（`.env`，已加入 `.gitignore`）

```env
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_DATABASE_URL=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

### Firebase Database Rules
Creator-Rooted 的安全規則架構，設定於 `database.rules.json`。透過 `$creatorUid` 及 `members` 節點動態判斷共用讀寫權限，並且實作了 **私人資料層級隔離** (`privateData`) 與 **單筆記帳防竄改** (`expenses`) 規則，從資料庫底層嚴格防止越權存取。
