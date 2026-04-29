import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase.js';
import { ref, get, update } from 'firebase/database';
import { useI18n } from '../lib/I18nContext.jsx';

const emailToKey = email => email.toLowerCase().replace(/\./g, '_').replace(/@/g, '-');

export default function InviteJoin({ token, currentUser, onJoined, onError }) {
  const { t } = useI18n();
  const [status, setStatus] = useState('loading'); // loading | invalid | expired | joining | error
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    if (!token || !currentUser?.uid) return;

    const join = async () => {
      try {
        // 1. 讀 invite token（所有登入者都能讀 invites/）
        const snap = await get(ref(db, `invites/${token}`));
        const invite = snap.val();

        if (!invite) { setStatus('invalid'); return; }
        if (invite.expiresAt && Date.now() > invite.expiresAt) { setStatus('expired'); return; }

        const { tripId, creatorUid } = invite;

        // 2. 從 invite 直接取行程名稱（不需要先讀 trips/，因為還沒有權限）
        setTripName(invite.tripName || '');
        setStatus('joining');

        // 3. 先寫入：加入 members + memberIndex + 刪除 token + memberProfile
        //    members.$uid.write 允許寫入自己的 uid，所以不需要是 creator
        const profileKey = emailToKey(currentUser.email);
        await update(ref(db), {
          [`trips/${creatorUid}/${tripId}/members/${currentUser.uid}`]: currentUser.email.toLowerCase(),
          [`memberIndex/${currentUser.uid}/${tripId}`]: creatorUid,
          [`invites/${token}`]: null,  // 加入後刪除 token
          [`trips/${creatorUid}/${tripId}/memberProfiles/${profileKey}`]: {
            uid: currentUser.uid,
            email: currentUser.email.toLowerCase(),
            displayName: currentUser.displayName || "",
            photoURL: currentUser.photoURL || "",
          },
        });

        // 4. 寫入後已在 members，現在才有權限讀行程
        const tripSnap = await get(ref(db, `trips/${creatorUid}/${tripId}`));
        const tripData = tripSnap.val();
        if (!tripData) { setStatus('invalid'); return; }

        onJoined({ ...tripData, id: tripId, creatorUid });
      } catch (e) {
        console.error('加入行程失敗', e);
        setStatus('error');
      }
    };

    join();
  }, [token, currentUser?.uid]);

  const styles = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: 20 },
    card: { background: 'var(--bg-card)', padding: '40px 32px', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 360, width: '100%' },
    icon: { fontSize: 48, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 },
    sub: { fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 },
    btn: { padding: '12px 24px', background: 'var(--btn-bg)', color: 'var(--btn-text)', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  };

  if (status === 'loading' || status === 'joining') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.icon}>✈️</div>
          <div style={styles.title}>
            {status === 'joining'
              ? t('invite.joining').replace('{name}', tripName)
              : t('invite.verifying')}
          </div>
          <div style={styles.sub}>{t('invite.please_wait')}</div>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.icon}>🚫</div>
          <div style={styles.title}>{t('invite.invalid_title')}</div>
          <div style={styles.sub}>{t('invite.invalid_desc')}<br />{t('invite.ask_creator')}</div>
          <button style={styles.btn} onClick={onError}>{t('invite.back_home')}</button>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.icon}>⏰</div>
          <div style={styles.title}>{t('invite.expired_title')}</div>
          <div style={styles.sub}>{t('invite.expired_desc')}<br />{t('invite.ask_creator')}</div>
          <button style={styles.btn} onClick={onError}>{t('invite.back_home')}</button>
        </div>
      </div>
    );
  }

  // error
  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.icon}>⚠️</div>
        <div style={styles.title}>{t('invite.error_title')}</div>
        <div style={styles.sub}>{t('invite.error_desc')}</div>
        <button style={styles.btn} onClick={onError}>{t('invite.back_home')}</button>
      </div>
    </div>
  );
}
