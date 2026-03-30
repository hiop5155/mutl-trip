import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TripPlanner from './components/TripPlanner.jsx';
import { auth } from './lib/firebase.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { useI18n } from './lib/I18nContext.jsx';

// whitelist
const ALLOWED_EMAILS = [
  "hiop5155@gmail.com",
  "kj8212123@gmail.com",
];

export default function App() {
  const { lang, setLang, theme, setTheme, t } = useI18n();
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
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", color: "var(--text-muted)" }}>{t('app.loading')}</div>;
  }

  // 門擋：只要沒登入，或是信箱不符合，就只會看到這個畫面
  if (!user || !isAllowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: 20 }}>
        <div style={{ background: "var(--bg-card)", padding: "50px 40px", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", margin: "0 0 10px 0" }}>{t('app.title')}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 36, lineHeight: 1.6, whiteSpace: "pre-line" }}>{t('app.login_reason')}</p>
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "transform 0.2s" }}>
            <span style={{ fontSize: 18 }}>G</span>
            {t('app.login_btn')}
          </button>
        </div>
      </div>
    );
  }

  // 確定是合法主人，才放行顯示以下內容
  return (
    <div style={{ position: "relative" }}>
      {/* 隱藏式的登出與設定按鈕（放在畫面最右上角） */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "6px 10px", borderRadius: 20, fontSize: 11, outline: "none", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          <option value="zh">繁中</option>
          <option value="en">EN</option>
        </select>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "6px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)" }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button onClick={handleLogout} style={{ background: "rgba(0,0,0,0.5)", color: "white", border: "none", padding: "6px 14px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)" }}>
          {user.email} ({t('app.logout')})
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
