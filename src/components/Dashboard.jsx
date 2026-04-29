import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { db } from '../lib/firebase.js';
import { ref, onValue, update, get, remove } from 'firebase/database';
import { CURRENCIES, DEFAULT_EXP_CATS, COUNTRY_CURRENCY, DESTINATION_CITIES } from '../lib/consts.js';

// Static city picker with search — uses pre-built Traditional Chinese list
function CityPicker({ value, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = query.trim()
    ? DESTINATION_CITIES.filter(c =>
        c.name.includes(query) ||
        c.en.toLowerCase().includes(query.toLowerCase()) ||
        (c.country_zh || "").includes(query)
      )
    : DESTINATION_CITIES;

  const select = (city) => { onChange(city); setQuery(""); setOpen(false); };
  const displayLabel = (v) => v ? `${v.name} · ${v.country_zh || ""}` : "";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div onMouseDown={() => setOpen(o => !o)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-main)", background: "var(--input-bg)", color: "var(--text-main)", fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
        <span style={{ color: value ? "var(--text-main)" : "var(--text-muted)" }}>
          {value ? displayLabel(value) : (placeholder || "選擇目的地城市...")}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border-main)", borderRadius: 10, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}>
          <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid var(--border-light)" }}>
            <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜尋城市（中文或英文）..."
              onMouseDown={e => e.stopPropagation()}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border-main)", background: "var(--input-bg)", color: "var(--text-main)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>無符合城市</div>
            )}
            {filtered.map(city => (
              <div key={city.en} onMouseDown={() => select(city)}
                style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", background: value?.en === city.en ? "var(--bg-accent)" : "transparent" }}>
                <span style={{ fontSize: 14, color: "var(--text-main)", fontWeight: 500 }}>{city.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, marginLeft: 8 }}>{city.country_zh}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTripStatus(dateStart, dateEnd) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  end.setHours(23, 59, 59, 999);
  if (today < start) {
    const days = Math.ceil((start - today) / 86400000);
    return { type: "upcoming", days };
  }
  if (today <= end) {
    const day = Math.floor((today - start) / 86400000) + 1;
    return { type: "ongoing", day };
  }
  return { type: "ended" };
}

// ── Invite Token Modal ────────────────────────────────────────────────────────
function InviteModal({ trip, currentUser, onClose }) {
  const { t } = useI18n();
  const [invites, setInvites] = useState({});
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  const isCreator = trip ? trip.creatorUid === currentUser.uid : false;

  // Listen to invites for this trip — hooks MUST be before any early return
  useEffect(() => {
    if (!db || !trip || !isCreator) return;
    const unsub = onValue(ref(db, "invites"), snap => {
      const all = snap.val() || {};
      const mine = {};
      Object.entries(all).forEach(([tok, data]) => {
        if (data.tripId === trip.id && data.creatorUid === currentUser.uid) {
          mine[tok] = data;
        }
      });
      setInvites(mine);
    });
    return () => unsub();
  }, [trip?.id, currentUser.uid, isCreator]);

  if (!trip) return null;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    const token = crypto.randomUUID();
    const expiresHours = 24;
    await update(ref(db), {
      [`invites/${token}`]: {
        tripId: trip.id,
        tripName: trip.name,          // ← 存行程名稱，讓加入者在取得權限前也能顯示
        creatorUid: currentUser.uid,
        createdAt: Date.now(),
        expiresAt: Date.now() + expiresHours * 60 * 60 * 1000,
        note: note.trim() || null,
      }
    });
    setNote("");
    setCreating(false);
  };

  const handleRevoke = (token) => {
    update(ref(db), { [`invites/${token}`]: null });
  };

  const handleCopy = (token) => {
    const url = `${window.location.origin}${window.location.pathname}#invite_${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }).catch(() => alert(`連結：${url}`));
  };

  const inviteList = Object.entries(invites);
  const now = Date.now();

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", animation: "slideUp 0.25s ease", maxHeight: "85vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>{t("dash.invite_title")}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{trip.name}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "var(--bg-accent)", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        {/* Members list */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t("dash.invite_members")}</div>
          {/* Creator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-accent)", borderRadius: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>{t("dash.share_creator")}</span>
            <span style={{ fontSize: 13, color: "var(--text-main)" }}>{currentUser.email}</span>
          </div>
          {/* Members */}
          {Object.entries(trip.members || {}).map(([uid, email]) => (
            <div key={uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, marginBottom: 4, background: uid === currentUser.uid ? "var(--bg-accent)" : "transparent", border: "1px solid var(--border-light)" }}>
              <span style={{ fontSize: 13, color: "var(--text-main)", flex: 1 }}>{email}</span>
              {uid === currentUser.uid && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>（{t("dash.share_you")}）</span>}
              {/* Creator can remove others */}
              {isCreator && uid !== currentUser.uid && (
                <button onClick={() => {
                  update(ref(db), {
                    [`trips/${trip.creatorUid}/${trip.id}/members/${uid}`]: null,
                    [`memberIndex/${uid}/${trip.id}`]: null,
                  });
                }} style={{ border: "none", background: "transparent", color: "#E57373", cursor: "pointer", fontSize: 12 }}>{t("dash.share_remove")}</button>
              )}
              {/* Member can leave themselves */}
              {!isCreator && uid === currentUser.uid && (
                <button onClick={() => {
                  if (!window.confirm(t("dash.confirm_leave"))) return;
                  update(ref(db), {
                    [`trips/${trip.creatorUid}/${trip.id}/members/${uid}`]: null,
                    [`memberIndex/${uid}/${trip.id}`]: null,
                  });
                  onClose();
                }} style={{ border: "none", background: "transparent", color: "#E57373", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>{t("dash.leave_trip")}</button>
              )}
            </div>
          ))}
          {Object.keys(trip.members || {}).length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0", textAlign: "center" }}>{t("dash.invite_no_members")}</div>
          )}
        </div>

        {/* Active invite links */}
        {isCreator && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t("dash.invite_active_links")}</div>
            {inviteList.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "10px 0", textAlign: "center", marginBottom: 12 }}>{t("dash.invite_no_links")}</div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                {inviteList.map(([token, data]) => {
                  const expired = data.expiresAt && now > data.expiresAt;
                  const remaining = data.expiresAt ? Math.max(0, Math.floor((data.expiresAt - now) / 3600000)) : null;
                  return (
                    <div key={token} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-light)", marginBottom: 6, opacity: expired ? 0.5 : 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-main)", fontWeight: 600 }}>{data.note || t("dash.invite_link_default")}</div>
                        <div style={{ fontSize: 10, color: expired ? "#E57373" : "var(--text-muted)" }}>
                          {expired
                            ? t("dash.invite_expired")
                            : remaining !== null
                            ? t("dash.invite_hours_left").replace("{h}", remaining)
                            : t("dash.invite_no_expiry")}
                        </div>
                      </div>
                      <button onClick={() => handleCopy(token)}
                        style={{ padding: "5px 10px", border: "1px solid var(--border-main)", borderRadius: 8, background: copiedToken === token ? "#E8F5E9" : "var(--bg-accent)", color: copiedToken === token ? "#2E7D32" : "var(--text-main)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                        {copiedToken === token ? t("dash.invite_copied") : t("dash.invite_copy")}
                      </button>
                      <button onClick={() => handleRevoke(token)}
                        style={{ border: "none", background: "transparent", color: "#E57373", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>{t("dash.invite_revoke")}</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create new invite */}
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t("dash.invite_create_new")}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder={t("dash.invite_note_placeholder")}
                style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--border-main)", borderRadius: 10, fontSize: 13, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
              <button onClick={handleCreate} disabled={creating}
                style={{ padding: "9px 16px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0, opacity: creating ? 0.6 : 1 }}>
                {t("dash.invite_create_btn")}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("dash.invite_expiry_hint")}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, isAdmin, onSelectTrip, initialTripId }) {
  const { t } = useI18n();
  // trips: { id: { ...meta, _creatorUid } }  — merged from creator + member
  const [ownTrips, setOwnTrips] = useState({});
  const [memberTrips, setMemberTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editingTripNameVal, setEditingTripNameVal] = useState("");
  const [editingStartDate, setEditingStartDate] = useState("");
  const [editingEndDate, setEditingEndDate] = useState("");
  const [editingDestination, setEditingDestination] = useState(null);
  const [inviteTrip, setInviteTrip] = useState(null); // holds trip object

  // New trip form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [destination, setDestination] = useState(null);

  // ── Listener 1: trips I created ──────────────────────────────────────────
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, `trips/${user.uid}`), snap => {
      const data = snap.val() || {};
      // Normalise: attach creatorUid so downstream code has one consistent shape
      const normalised = {};
      Object.entries(data).forEach(([tripId, trip]) => {
        normalised[tripId] = { ...trip, creatorUid: user.uid };
      });
      setOwnTrips(normalised);
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  // ── Listener 2: trips I'm a member of (via memberIndex) ──────────────────
  useEffect(() => {
    if (!db) return;
    const unsub = onValue(ref(db, `memberIndex/${user.uid}`), async snap => {
      const index = snap.val() || {}; // { tripId: creatorUid }
      if (Object.keys(index).length === 0) { setMemberTrips({}); return; }

      const results = {};
      await Promise.all(
        Object.entries(index).map(async ([tripId, creatorUid]) => {
          try {
            const tripSnap = await get(ref(db, `trips/${creatorUid}/${tripId}`));
            if (tripSnap.val()) {
              results[tripId] = { ...tripSnap.val(), creatorUid };
            }
          } catch (e) { /* trip may have been deleted */ }
        })
      );
      setMemberTrips(results);
    });
    return () => unsub();
  }, [user.uid]);

  // ── Auto-navigate on shared link ─────────────────────────────────────────
  useEffect(() => {
    if (!initialTripId || loading) return;
    const allTrips = { ...ownTrips, ...memberTrips };
    const trip = allTrips[initialTripId];
    if (trip) onSelectTrip(trip);
  }, [loading, initialTripId, ownTrips, memberTrips]);

  const isTripCreator = (trip) => isAdmin || trip.creatorUid === user.uid;

  const handleCreate = () => {
    if (!name.trim() || !startDate || !endDate) { alert(t("dash.err_info")); return; }
    if (new Date(endDate) < new Date(startDate)) { alert(t("dash.err_date")); return; }

    const tripId = "trip_" + Date.now();
    const autoCurrency = (destination && COUNTRY_CURRENCY[destination.country_code]) || "KRW";

    const meta = {
      id: tripId,
      name: name.trim(),
      dateStart: startDate,
      dateEnd: endDate,
      currency: autoCurrency,
      creatorUid: user.uid,
      members: {},
      createdAt: Date.now(),
      ...(destination ? { destination } : {}),
    };

    const days = [];
    const colors = ["#E8A87C", "#D4A5A5", "#95B8D1", "#B5CDA3", "#C3B1E1", "#F2D0A4"];
    const wds = [t("day_sun"), t("day_mon"), t("day_tue"), t("day_wed"), t("day_thu"), t("day_fri"), t("day_sat")];
    let dId = 1;
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({ id: `day${dId}`, date: `${d.getMonth() + 1}/${d.getDate()} (${wds[d.getDay()]})`, title: `Day ${dId}`, color: colors[(dId - 1) % colors.length], items: [] });
      dId++;
    }

    const updates = {};
    updates[`trips/${user.uid}/${tripId}`] = meta;
    updates[`tripData/${user.uid}/${tripId}`] = { days, notes: "", expenses: [], expCats: DEFAULT_EXP_CATS, flights: { outbound: {}, inbound: {} }, accommodation: {} };

    update(ref(db), updates).then(() => {
      setShowNew(false);
      setName(""); setStartDate(""); setEndDate(""); setDestination(null);
    }).catch(e => { console.error("建立行程失敗", e); alert(t("dash.err_create_short") + "：" + e.message); });
  };

  const handleDelete = (e, trip) => {
    e.stopPropagation();
    if (!window.confirm(t("dash.confirm_delete"))) return;
    const updates = {
      [`trips/${trip.creatorUid}/${trip.id}`]: null,
      [`tripData/${trip.creatorUid}/${trip.id}`]: null,
    };
    // Also clean up memberIndex for all members
    Object.keys(trip.members || {}).forEach(uid => {
      updates[`memberIndex/${uid}/${trip.id}`] = null;
    });
    update(ref(db), updates).catch(err => alert(t("dash.err_delete") + "：" + err.message));
  };

  const handleEditStart = (e, trip) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setEditingTripNameVal(trip.name);
    setEditingStartDate(trip.dateStart || "");
    setEditingEndDate(trip.dateEnd || "");
    const dest = trip.destination;
    if (!dest) { setEditingDestination(null); }
    else if (dest.name) { setEditingDestination(dest); }
    else if (dest.en) { setEditingDestination({ name: dest.en, country_zh: dest.zh || dest.en }); }
    else { setEditingDestination({ name: String(dest), country_zh: "" }); }
  };

  const handleEditSave = async (e, trip) => {
    e.stopPropagation();
    if (!editingTripNameVal.trim()) { alert(t("dash.err_name")); return; }
    if (new Date(editingEndDate) < new Date(editingStartDate)) { alert(t("dash.err_date")); return; }

    const autoCurrency = (editingDestination?.country_code && COUNTRY_CURRENCY[editingDestination.country_code])
      || trip.currency || "KRW";
    const updates = {
      [`trips/${trip.creatorUid}/${trip.id}/name`]: editingTripNameVal.trim(),
      [`trips/${trip.creatorUid}/${trip.id}/currency`]: autoCurrency,
      [`trips/${trip.creatorUid}/${trip.id}/destination`]: editingDestination || null,
    };

    const datesChanged = editingStartDate !== trip.dateStart || editingEndDate !== trip.dateEnd;
    if (datesChanged) {
      updates[`trips/${trip.creatorUid}/${trip.id}/dateStart`] = editingStartDate;
      updates[`trips/${trip.creatorUid}/${trip.id}/dateEnd`] = editingEndDate;
      try {
        const snap = await get(ref(db, `tripData/${trip.creatorUid}/${trip.id}/days`));
        const oldDays = snap.val() || [];
        const colors = ["#E8A87C", "#D4A5A5", "#95B8D1", "#B5CDA3", "#C3B1E1", "#F2D0A4"];
        const wds = [t("day_sun"), t("day_mon"), t("day_tue"), t("day_wed"), t("day_thu"), t("day_fri"), t("day_sat")];
        const newDays = [];
        let dId = 1;
        const start = new Date(editingStartDate); start.setHours(0, 0, 0, 0);
        const end = new Date(editingEndDate); end.setHours(23, 59, 59, 999);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const old = oldDays[dId - 1];
          newDays.push({ id: `day${dId}`, date: `${d.getMonth() + 1}/${d.getDate()} (${wds[d.getDay()]})`, title: old?.title || `Day ${dId}`, color: old?.color || colors[(dId - 1) % colors.length], items: old?.items || [] });
          dId++;
        }
        updates[`tripData/${trip.creatorUid}/${trip.id}/days`] = newDays;
      } catch (err) { console.error("更新行程日期失敗", err); }
    }

    update(ref(db), updates).catch(err => alert(t("dash.err_update") + "：" + err.message));
    setEditingTripId(null);
  };

  const handleDuplicate = async (e, trip) => {
    e.stopPropagation();
    const newId = `trip_${Date.now()}`;
    const newMeta = {
      id: newId,
      name: trip.name + "（副本）",
      dateStart: trip.dateStart,
      dateEnd: trip.dateEnd,
      currency: trip.currency,
      creatorUid: user.uid,
      members: {},
      createdAt: Date.now(),
      ...(trip.destination ? { destination: trip.destination } : {}),
    };
    try {
      const snap = await get(ref(db, `tripData/${trip.creatorUid}/${trip.id}`));
      const orig = snap.val() || {};
      const newTripData = {
        days: orig.days || [],
        expenses: [],
        expCats: orig.expCats || DEFAULT_EXP_CATS,
        flights: { outbound: {}, inbound: {} },
        accommodation: {},
        sharedNotes: [],
        packingList: [],
      };
      await update(ref(db), {
        [`trips/${user.uid}/${newId}`]: newMeta,
        [`tripData/${user.uid}/${newId}`]: newTripData,
      });
      setEditingTripId(newId);
      setEditingTripNameVal(newMeta.name);
      setEditingStartDate(newMeta.dateStart);
      setEditingEndDate(newMeta.dateEnd);
      const dest = newMeta.destination;
      if (!dest) setEditingDestination(null);
      else if (dest.name) setEditingDestination(dest);
      else if (dest.en) setEditingDestination({ name: dest.en, country_zh: dest.zh || "" });
      else setEditingDestination(null);
    } catch (err) {
      alert("複製失敗：" + err.message);
    }
  };

  // Merge and sort all trips
  const allTrips = { ...memberTrips, ...ownTrips }; // ownTrips wins on collision
  // Filter out any malformed entries (e.g. old UID-keyed nodes without id), then sort
  const tripList = Object.values(allTrips)
    .filter(t => t && typeof t.id === "string")
    .sort((a, b) => b.id.localeCompare(a.id));

  // Keep invite modal in sync with live trip state
  const activeInviteTrip = inviteTrip ? (allTrips[inviteTrip.id] || inviteTrip) : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)", marginBottom: 30 }}>🌍 {t("dash.title")}</h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("dash.loading")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tripList.map(trip => (
              <div key={trip.id} onClick={() => onSelectTrip(trip)}
                style={{ background: "var(--bg-card)", borderRadius: 16, padding: "44px 20px 20px", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", transition: "transform 0.2s", position: "relative" }}>

                {/* Invite button — top left */}
                <div style={{ position: "absolute", top: 14, left: 16 }}>
                  <button onClick={(e) => { e.stopPropagation(); setInviteTrip(trip); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    🔗 <span>{t("dash.share_btn")}</span>
                  </button>
                </div>

                {/* Edit + Delete + Duplicate — top right (creator only) */}
                {isTripCreator(trip) && (
                  <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 4 }}>
                    <button onClick={(e) => handleDuplicate(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 6px", borderRadius: 6 }}>⧉</button>
                    <button onClick={(e) => handleEditStart(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 5 }}>✏️</button>
                    <button onClick={(e) => handleDelete(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 5 }}>🗑</button>
                  </div>
                )}

                {(() => {
                  const status = getTripStatus(trip.dateStart, trip.dateEnd);
                  const badgeStyle = {
                    upcoming: { bg: "#E3F2FD", color: "#1565C0" },
                    ongoing: { bg: "#E8F5E9", color: "#2E7D32" },
                    ended: { bg: "var(--bg-accent)", color: "var(--text-muted)" },
                  }[status.type];
                  const label = status.type === "upcoming"
                    ? t("dash.status_upcoming").replace("{days}", status.days)
                    : status.type === "ongoing"
                    ? t("dash.status_ongoing").replace("{day}", status.day)
                    : t("dash.status_ended");
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{trip.dateStart} — {trip.dateEnd}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: badgeStyle.bg, color: badgeStyle.color, fontWeight: 600 }}>{label}</span>
                    </div>
                  );
                })()}

                {editingTripId === trip.id ? (
                  <div style={{ marginBottom: 8 }} onClick={e => e.stopPropagation()}>
                    <input autoFocus value={editingTripNameVal} onChange={e => setEditingTripNameVal(e.target.value)}
                      placeholder={t("dash.trip_name")}
                      style={{ fontSize: 18, fontWeight: 700, border: "none", borderBottom: "2px solid var(--btn-bg)", outline: "none", width: "100%", padding: "2px 0", color: "var(--text-main)", background: "transparent", marginBottom: 12 }} />
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{t("dash.startDate")}</div>
                        <input type="date" value={editingStartDate} onChange={e => setEditingStartDate(e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-main)", fontSize: 12, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{t("dash.endDate")}</div>
                        <input type="date" value={editingEndDate} min={editingStartDate} onChange={e => setEditingEndDate(e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-main)", fontSize: 12, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
                      </div>
                    </div>
                    {(() => {
                      const cur = (editingDestination?.country_code && COUNTRY_CURRENCY[editingDestination.country_code]) || trip.currency || "KRW";
                      return (
                        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("dash.currency")}</span>
                          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: "var(--bg-accent)", color: "var(--text-main)", fontWeight: 600 }}>{cur} — {t(`cur.${cur}`)}</span>
                        </div>
                      );
                    })()}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{t("dash.destination")}</div>
                      <CityPicker value={editingDestination} onChange={setEditingDestination} placeholder={t("dash.destination_search")} />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => handleEditSave(e, trip)} style={{ padding: "4px 12px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{t("dash.save")}</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTripId(null); }} style={{ padding: "4px 12px", background: "var(--btn-hover)", color: "var(--text-muted)", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{t("dash.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>{trip.name}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", background: "#E8F5E9", borderRadius: 6, color: "#2E7D32" }}>{t(`cur.${trip.currency}`) || trip.currency}</span>
                      {trip.destination && (
                        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-accent)", borderRadius: 6, color: "var(--text-muted)" }}>
                          📍 {typeof trip.destination === "object" ? (trip.destination.name || trip.destination.zh || trip.destination.en) : trip.destination}
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-accent)", borderRadius: 6, color: "var(--text-muted)" }}>
                        👥 {t("dash.invite_members_count").replace("{n}", 1 + Object.keys(trip.members || {}).length)}
                      </span>
                      {!isTripCreator(trip) && (
                        <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-accent)", borderRadius: 6, color: "var(--text-muted)" }}>{t("dash.shared_trip_badge")}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            {tripList.length === 0 && !showNew && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                {t("dash.empty")}
              </div>
            )}
          </div>
        )}

        {/* New trip form — all logged-in users */}
        <div style={{ marginTop: 30 }}>
          {showNew ? (
            <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", animation: "slideUp 0.3s ease" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "var(--text-main)" }}>{t("dash.new_trip")}</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.trip_name")}</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t("dash.placeholder_name")}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none", background: "var(--input-bg)", color: "var(--text-main)", fontSize: 14 }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.startDate")}</div>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.endDate")}</div>
                  <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  {t("dash.destination")} <span style={{ opacity: 0.6, fontSize: 11 }}>({t("dash.destination_hint")})</span>
                </div>
                <CityPicker value={destination} onChange={setDestination} placeholder={t("dash.destination_search")} />
                {destination && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("dash.currency_desc")}：</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--bg-accent)", color: "var(--text-main)", fontWeight: 600 }}>
                      {(() => { const c = COUNTRY_CURRENCY[destination.country_code] || "KRW"; return `${c} — ${t(`cur.${c}`)}`; })()}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCreate}
                  style={{ flex: 1, padding: 12, background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                  {t("dash.create_btn")}
                </button>
                <button onClick={() => setShowNew(false)}
                  style={{ padding: "12px 20px", background: "var(--btn-hover)", color: "var(--text-muted)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                  {t("dash.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)}
              style={{ width: "100%", padding: 16, border: "2px dashed var(--border-main)", borderRadius: 16, background: "transparent", color: "var(--text-muted)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              {t("dash.add_trip_card")}
            </button>
          )}
        </div>
      </div>

      {/* Invite modal */}
      {activeInviteTrip && (
        <InviteModal
          trip={activeInviteTrip}
          currentUser={user}
          onClose={() => setInviteTrip(null)}
        />
      )}
    </div>
  );
}
