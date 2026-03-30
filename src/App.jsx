import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TripPlanner from './components/TripPlanner.jsx';
import { auth } from './lib/firebase.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

// 💌 你的專屬白名單：只有這些 Google 信箱才能進去看行程
const ALLOWED_EMAILS = [
  "hiop5155@gmail.com",
  "kj8212123@gmail.com",
];

export default function App() {
  const [currentTrip, setCurrentTrip] = useState(null);

  // user=undefined 代表還在「檢查中」，避免畫面閃爍
  const [user, setUser] = useState(undefined);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // 監聽登入狀態改變
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        // 檢查登入的信箱有沒有在白名單裡面！
        const emailAllowed = ALLOWED_EMAILS.includes(u.email.toLowerCase());
        setUser(u);
        setIsAllowed(emailAllowed);

        // 如果登入了但不在名單內，強制踢出去
        if (!emailAllowed) {
          signOut(auth);
          alert(`抱歉呀，您的信箱 (${u.email}) 不在受邀名單中哦！`);
        }
      } else {
        setUser(null);
        setIsAllowed(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => {
      console.error("登入錯誤", err);
    });
  };

  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？")) {
      signOut(auth).then(() => setCurrentTrip(null));
    }
  };

  if (user === undefined) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", color: "#999" }}>登入狀態確認中...</div>;
  }

  // 門擋：只要沒登入，或是信箱不符合，就只會看到這個畫面
  if (!user || !isAllowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F2", padding: 20 }}>
        <div style={{ background: "white", padding: "50px 40px", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#2D2926", margin: "0 0 10px 0" }}>旅行手帳系統</h1>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 36, lineHeight: 1.6 }}>這是一個私人專屬的行程規劃空間<br />請使用受邀的 Google 帳號登入</p>
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "#2D2926", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.2s" }}>
            <span style={{ fontSize: 18 }}>G</span>
            使用 Google 繼續
          </button>
        </div>
      </div>
    );
  }

  // 確定是合法主人，才放行顯示以下內容
  return (
    <div style={{ position: "relative" }}>
      {/* 隱藏式的登出按鈕（放在畫面最右上角） */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
        <button onClick={handleLogout} style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "none", padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)" }}>
          {user.email} (登出)
        </button>
      </div>

      {currentTrip ? (
        <TripPlanner
          tripId={currentTrip.id}
          tripMeta={currentTrip}
          onBack={() => setCurrentTrip(null)}
        />
      ) : (
        <Dashboard onSelectTrip={setCurrentTrip} />
      )}
    </div>
  );
}
