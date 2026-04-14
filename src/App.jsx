import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TripPlanner from './components/TripPlanner.jsx';
import { auth, db } from './lib/firebase.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ref, onValue, update } from 'firebase/database';
import { useI18n } from './lib/I18nContext.jsx';

// 管理員帳號：可建立行程、看到所有行程
const ADMIN_EMAILS = [
  "hiop5155@gmail.com",
  "kj8212123@gmail.com",
];

export default function App() {
  const { lang, setLang, theme, setTheme, t } = useI18n();
  const [currentTrip, setCurrentTrip] = useState(null);
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  // Read trip ID from URL hash on first load
  const [initialTripId] = useState(() => {
    const h = window.location.hash.slice(1);
    return h.startsWith('trip_') ? h : null;
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(ADMIN_EMAILS.includes(u.email.toLowerCase()));
      } else {
        setUser(null);
        setIsAdmin(false);
        setCustomDisplayName(null);
      }
    });
    return () => unsub();
  }, []);

  // Load custom display name from Firebase
  useEffect(() => {
    if (!user || !db) return;
    const unsub = onValue(ref(db, `userProfiles/${user.uid}/displayName`), snap => {
      setCustomDisplayName(snap.val() || null);
    });
    return () => unsub();
  }, [user?.uid]);

  const saveDisplayName = (val) => {
    const trimmed = val.trim();
    if (!trimmed || !user) { setEditingName(false); return; }
    update(ref(db), { [`userProfiles/${user.uid}/displayName`]: trimmed }).catch(console.error);
    setCustomDisplayName(trimmed);
    setEditingName(false);
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => console.error("登入錯誤", err));
  };

  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？")) {
      signOut(auth).then(() => { setCurrentTrip(null); history.replaceState(null, '', location.pathname); });
    }
  };

  const handleSelectTrip = (trip) => {
    setCurrentTrip(trip);
    history.replaceState(null, '', '#' + trip.id);
  };

  const handleBack = () => {
    setCurrentTrip(null);
    history.replaceState(null, '', location.pathname);
  };

  // Effective user: override displayName with custom name if set
  const effectiveUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: customDisplayName || user.displayName,
    photoURL: user.photoURL,
  } : null;

  const shownName = customDisplayName || user?.displayName || user?.email;

  if (user === undefined) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", color: "var(--text-muted)" }}>{t('app.loading')}</div>;
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: 20 }}>
        <div style={{ background: "var(--bg-card)", padding: "50px 40px", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", margin: "0 0 10px 0" }}>{t('app.title')}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 36, lineHeight: 1.6, whiteSpace: "pre-line" }}>{t('app.login_reason')}</p>
          <button onClick={handleLogin} style={{ width: "100%", padding: 14, background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>G</span>
            {t('app.login_btn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", gap: 8, alignItems: "center" }}>
        <select value={lang} onChange={e => setLang(e.target.value)}
          style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "6px 10px", borderRadius: 20, fontSize: 11, outline: "none", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          <option value="zh">繁中</option>
          <option value="en">EN</option>
        </select>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "6px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)" }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User identity + logout + name edit */}
        <div style={{ background: "rgba(0,0,0,0.5)", color: "white", borderRadius: 20, fontSize: 11, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 7, padding: "5px 12px 5px 6px" }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
            : <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#C4A882", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(shownName || "?")[0].toUpperCase()}</span>
          }
          {editingName ? (
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveDisplayName(nameVal); if (e.key === "Escape") setEditingName(false); }}
              onBlur={() => saveDisplayName(nameVal)}
              autoFocus
              placeholder={t('app.name_placeholder')}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.5)", color: "white", fontSize: 11, outline: "none", width: 100, padding: "0 0 1px 0" }}
            />
          ) : (
            <span
              onClick={() => { setNameVal(shownName || ""); setEditingName(true); }}
              style={{ cursor: "pointer" }}
              title={t('app.edit_name')}
            >
              {shownName} ✏️
            </span>
          )}
          <span style={{ opacity: 0.5 }}>·</span>
          <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "white", fontSize: 11, cursor: "pointer", padding: 0 }}>{t('app.logout')}</button>
        </div>
      </div>

      {currentTrip ? (
        <TripPlanner
          tripId={currentTrip.id}
          tripMeta={currentTrip}
          currentUser={effectiveUser}
          isAdmin={isAdmin}
          onBack={handleBack}
        />
      ) : (
        <Dashboard user={user} isAdmin={isAdmin} onSelectTrip={handleSelectTrip} initialTripId={initialTripId} />
      )}
    </div>
  );
}
