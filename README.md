# ✈️ 旅行手帳系統 (Multi-Trip Planner)

這是一個基於 **React + Vite** 開發的私人多人旅行管理系統。結合 Firebase Realtime Database 實現跨裝置即時同步，並透過 Gmail 白名單 + 行程分享機制管控存取權限。

## 🌟 主要功能

- 🔐 **雙層存取控制**：管理員帳號（`ADMIN_EMAILS`）可建立行程；每個行程可透過 Gmail 邀請其他使用者存取，無需為管理員。
- 🔗 **行程分享連結**：Share 按鈕產生帶有 `#tripId` 的 URL，對方開啟連結後自動跳轉至該行程。
- 👤 **Gmail 身份識別**：使用者以 Gmail 登入後，系統自動抓取 Google 帳號顯示名稱；支援在 App 頂欄直接編輯自訂暱稱（儲存於 Firebase）。名字變更後，過去的記帳與備忘錄記錄會自動同步更新。
- 🌍 **多行程 Dashboard**：管理所有進行中或過去的旅行計畫，支援即時共編。
- 🗓️ **每日行程規劃**：自動依出發/回程日期生成天數，每天可新增地點、時間、地圖連結、類型標籤。點開項目可加入所有人可見的共享備忘錄（只有本人可刪除）。
- ✈️ **資訊面板**：航班卡片與住宿卡片，方便出發/抵達時快速查閱。
- 💰 **多幣別記帳**：即時匯率（exchangerate-api.com），支援平分 / 自己出，多人結算使用貪婪最小轉帳演算法，記帳顯示名稱隨暱稱即時更新。
- 📝 **雙層備忘錄**：行程項目內的備忘錄所有人可見（只有本人可刪除）；備忘 Tab 下的為私人備忘（只有自己看得到）。
- 🌓 **深/淺色模式** + 繁中/英文切換，偏好儲存於 `localStorage`。

## 🚀 技術棧

- **Frontend**: React 18 + Vite 5
- **Database**: Firebase Realtime Database
- **Auth**: Firebase Authentication (Google OAuth)
- **Hosting**: Firebase Hosting

## 🛠️ 環境設定與啟動

### 1. 安裝套件
```bash
npm install
```

### 2. 環境變數設定
在專案根目錄建立 `.env`（已加入 `.gitignore`）：
```env
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_DATABASE_URL=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_SENDER_ID=""
VITE_FIREBASE_APP_ID=""
```

### 3. 本地開發
```bash
npm run dev
```

### 4. 部署
```bash
npm run build
firebase deploy
```
