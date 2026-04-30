import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TripPlanner from './components/TripPlanner.jsx';
import InviteJoin from './components/InviteJoin.jsx';
import { auth, db } from './lib/firebase.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ref, onValue, update, get } from 'firebase/database';
import { useI18n } from './lib/I18nContext.jsx';

// 管理員 email 清單（可加入你自己的 email 取得 isAdmin 權限）
// 新架構下所有登入者都能建立行程，isAdmin 只影響能否編輯/刪除別人的行程
const ADMIN_EMAILS = [];

export default function App() {
  const { lang, setLang, theme, setTheme, t } = useI18n();
  const [currentTrip, setCurrentTrip] = useState(null);

  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [loginError, setLoginError] = useState(null); // 'missing_state' | null

  // Parse URL hash: #trip_xxx (direct link) or invite#TOKEN (invite link)
  const [initialTripId, setInitialTripId] = useState(() => {
    const h = window.location.hash.slice(1);
    return h.startsWith('trip_') ? h : null;
  });
  // inviteToken needs a setter so onError can clear state (not just the URL hash)
  const [inviteToken, setInviteToken] = useState(() => {
    const h = window.location.hash.slice(1);
    return h.startsWith('invite_') ? h.slice(7) : null;
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
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => {
      console.error("登入錯誤", err);
      const msg = (err.message || '') + (err.code || '');
      if (msg.includes('missing initial state') || msg.includes('popup-closed') || msg.includes('internal-error') || err.code === 'auth/popup-blocked') {
        setLoginError('missing_state');
      }
    });
  };

  const handleLogout = () => {
    if (window.confirm("確定要登出嗎？")) {
      signOut(auth).then(() => { setCurrentTrip(null); setInitialTripId(null); history.replaceState(null, '', location.pathname); });
    }
  };

  const handleSelectTrip = (trip) => {
    setCurrentTrip(trip);
    history.replaceState(null, '', '#' + trip.id);
  };

  const handleBack = () => {
    setCurrentTrip(null);
    setInitialTripId(null); // prevent Dashboard auto-navigate from re-triggering
    history.replaceState(null, '', location.pathname);
  };

  // Effective user: override displayName with custom name if set
  const effectiveUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: customDisplayName || user.displayName,
    photoURL: user.photoURL,
  } : null;

  const handleInviteJoined = (trip) => {
    setInviteToken(null);
    history.replaceState(null, '', '#' + trip.id);
    setCurrentTrip(trip);
  };

  const shownName = customDisplayName || user?.displayName || user?.email;

  // Shared lang toggle shown on all pre-login screens
  const LangToggle = () => (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
      <select value={lang} onChange={e => setLang(e.target.value)}
        style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "6px 10px", borderRadius: 20, fontSize: 11, outline: "none", cursor: "pointer" }}>
        <option value="zh">繁中</option>
        <option value="en">EN</option>
      </select>
    </div>
  );

  if (user === undefined) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", color: "var(--text-muted)" }}>
        <LangToggle />
        {t('app.loading')}
      </div>
    );
  }

  if (loginError === 'missing_state') {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: 20 }}>
        <LangToggle />
        <div style={{ background: "var(--bg-card)", padding: "50px 40px", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.05)", textAlign: "center", maxWidth: 400, width: "100%" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-main)", margin: "0 0 12px 0" }}>{t('app.browser_required_title')}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 28, whiteSpace: "pre-line" }}>
            {t('app.browser_required_desc')}
          </p>
          <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
            <button onClick={() => setLoginError(null)}
              style={{ padding: "12px 20px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t('app.retry_login')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: 20 }}>
        <LangToggle />
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
      {/* ── Fixed top bar: 50px, single line ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 50, zIndex: 9999, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", pointerEvents: "none" }}>
        {/* Back button — leftmost, only in trip view */}
        {currentTrip && (
          <button onClick={handleBack}
            style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)", pointerEvents: "auto", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t('trip.back_dash')}
          </button>
        )}
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Lang selector */}
        <select value={lang} onChange={e => setLang(e.target.value)}
          style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "5px 8px", borderRadius: 20, fontSize: 11, outline: "none", cursor: "pointer", backdropFilter: "blur(4px)", pointerEvents: "auto", flexShrink: 0 }}>
          <option value="zh">繁中</option>
          <option value="en">EN</option>
        </select>
        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: "var(--bg-accent)", color: "var(--text-main)", border: "none", padding: "5px 9px", borderRadius: 20, fontSize: 11, cursor: "pointer", backdropFilter: "blur(4px)", pointerEvents: "auto", flexShrink: 0 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {/* User identity + logout */}
        <div style={{ background: "rgba(0,0,0,0.5)", color: "white", borderRadius: 20, fontSize: 11, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 5px", pointerEvents: "auto", overflow: "hidden", maxWidth: 220, flexShrink: 1 }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
            : <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#C4A882", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(shownName || "?")[0].toUpperCase()}</span>
          }
          {editingName ? (
            <input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") saveDisplayName(nameVal); if (e.key === "Escape") setEditingName(false); }}
              onBlur={() => saveDisplayName(nameVal)}
              autoFocus
              placeholder={t('app.name_placeholder')}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.5)", color: "white", fontSize: 11, outline: "none", width: 80, padding: "0 0 1px 0", flexShrink: 1 }}
            />
          ) : (
            <span
              onClick={() => { setNameVal(shownName || ""); setEditingName(true); }}
              style={{ cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1, minWidth: 0 }}
              title={t('app.edit_name')}
            >
              {shownName} ✏️
            </span>
          )}
          <span style={{ opacity: 0.5, flexShrink: 0 }}>·</span>
          <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "white", fontSize: 11, cursor: "pointer", padding: 0, flexShrink: 0, whiteSpace: "nowrap" }}>{t('app.logout')}</button>
        </div>
      </div>

      {/* Content shifted down by bar height */}
      <div style={{ paddingTop: 50 }}>
        {inviteToken && !currentTrip ? (
          <InviteJoin
            token={inviteToken}
            currentUser={effectiveUser}
            onJoined={handleInviteJoined}
            onError={() => { setInviteToken(null); history.replaceState(null, '', location.pathname); }}
          />
        ) : currentTrip ? (
          <TripPlanner
            tripId={currentTrip.id}
            tripMeta={currentTrip}
            creatorUid={currentTrip.creatorUid}
            currentUser={effectiveUser}
            isAdmin={isAdmin}
            onBack={handleBack}
          />
        ) : (
          <Dashboard user={user} isAdmin={isAdmin} onSelectTrip={handleSelectTrip} initialTripId={initialTripId} />
        )}
      </div>
    </div>
  );
}
