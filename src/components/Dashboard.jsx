import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { db } from '../lib/firebase.js';
import { ref, onValue, update, get } from 'firebase/database';
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

// Firebase key can't contain . so we sanitise email for use as a key
const emailToKey = email => email.toLowerCase().replace(/\./g, '_').replace(/@/g, '-');

// A trip is accessible when:
//  • it has no allowedEmails yet  (backward compat — all old trips)
//  • OR the user's email key is listed
function canAccessTrip(trip, userEmail) {
  if (!trip.allowedEmails || Object.keys(trip.allowedEmails).length === 0) return true;
  return emailToKey(userEmail) in trip.allowedEmails;
}

// ── Generic tag input (used for both traveler names and email addresses) ──────
function TagInput({ value, onChange, placeholder, validate }) {
  const [tmp, setTmp] = useState("");

  const add = (e) => {
    e?.preventDefault();
    const v = tmp.trim();
    if (!v || value.includes(v)) return;
    if (validate && !validate(v)) return;
    onChange([...value, v]);
    setTmp("");
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {value.map(v => (
            <div key={v} style={{ padding: "4px 10px", background: "var(--bg-accent)", borderRadius: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "var(--text-main)" }}>
              {v}
              <button onClick={e => { e.preventDefault(); e.stopPropagation(); onChange(value.filter(x => x !== v)); }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: 0, fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={tmp} onChange={e => setTmp(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); add(e); } }}
          placeholder={placeholder}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
        <button onClick={add}
          style={{ padding: "8px 14px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>＋</button>
      </div>
    </div>
  );
}

// ── Share modal ───────────────────────────────────────────────────────────────
function ShareModal({ trip, currentUser, isCreator, onClose }) {
  const { t } = useI18n();
  const [newEmail, setNewEmail] = useState("");
  const [copied, setCopied] = useState(false);
  if (!trip) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${trip.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => alert(url));
  };

  const emailList = Object.values(trip.allowedEmails || {});
  const isEmailValid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleAdd = () => {
    const clean = newEmail.trim().toLowerCase();
    if (!isEmailValid(clean)) { alert(t("dash.share_invalid_email")); return; }
    update(ref(db), { [`trips/${trip.id}/allowedEmails/${emailToKey(clean)}`]: clean })
      .catch(e => alert("新增失敗：" + e.message));
    setNewEmail("");
  };

  const handleRemove = (email) => {
    if (email.toLowerCase() === trip.creatorEmail?.toLowerCase()) return; // 不能移除建立者
    update(ref(db), { [`trips/${trip.id}/allowedEmails/${emailToKey(email)}`]: null })
      .catch(e => alert("移除失敗：" + e.message));
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--bg-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", animation: "slideUp 0.25s ease" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>🔗 {t("dash.share_title")}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{trip.name}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "var(--bg-accent)", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        {/* Copy link row */}
        <button onClick={handleCopyLink}
          style={{ width: "100%", padding: "10px 14px", marginBottom: 16, borderRadius: 10, border: "1px solid var(--border-main)", background: copied ? "#E8F5E9" : "var(--bg-accent)", color: copied ? "#2E7D32" : "var(--text-main)", fontSize: 13, cursor: "pointer", fontWeight: 600, textAlign: "center", transition: "all 0.2s" }}>
          {copied ? `✅ ${t("dash.link_copied")}` : `🔗 ${t("dash.copy_link")}`}
        </button>

        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>{t("dash.share_access")}</div>

        {emailList.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0", textAlign: "center", borderRadius: 8, background: "var(--bg-accent)", marginBottom: 16 }}>
            {t("dash.share_empty")}
          </div>
        ) : (
          <div style={{ marginBottom: 16, borderRadius: 10, border: "1px solid var(--border-light)", overflow: "hidden" }}>
            {emailList.map((email, idx) => (
              <div key={email}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: idx < emailList.length - 1 ? "1px solid var(--border-light)" : "none", background: email.toLowerCase() === currentUser.email.toLowerCase() ? "var(--bg-accent)" : "transparent" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                    {email.toLowerCase() === trip.creatorEmail?.toLowerCase() ? t("dash.share_creator") :
                      email.toLowerCase() === currentUser.email.toLowerCase() ? t("dash.share_you") : t("dash.share_guest")}
                  </div>
                </div>
                {isCreator && email.toLowerCase() !== trip.creatorEmail?.toLowerCase() && (
                  <button onClick={() => handleRemove(email)}
                    style={{ border: "none", background: "transparent", color: "#E57373", cursor: "pointer", fontSize: 12, flexShrink: 0, marginLeft: 8 }}>
                    {t("dash.share_remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isCreator && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t("dash.share_add")}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="example@gmail.com"
                style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--border-main)", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
              <button onClick={handleAdd}
                style={{ padding: "9px 16px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
                ＋
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ user, isAdmin, onSelectTrip, initialTripId }) {
  const { t } = useI18n();
  const [trips, setTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editingTripNameVal, setEditingTripNameVal] = useState("");
  const [editingCurrencyVal, setEditingCurrencyVal] = useState("KRW");
  const [editingStartDate, setEditingStartDate] = useState("");
  const [editingEndDate, setEditingEndDate] = useState("");
  const [editingDestination, setEditingDestination] = useState(null);
  const [shareTrip, setShareTrip] = useState(null); // holds tripId string

  // New trip form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [inviteEmails, setInviteEmails] = useState([]);
  const [destination, setDestination] = useState(null); // { en, zh } object

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, "trips"), (snap) => {
      const data = snap.val() || {};
      setTrips(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Auto-navigate when opening a shared link
  useEffect(() => {
    if (!initialTripId || loading) return;
    const trip = trips[initialTripId];
    if (trip && canAccessTrip(trip, user.email)) {
      onSelectTrip(trip);
    }
  }, [loading, initialTripId, trips]);

  const isEmailValid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isTripCreator = (trip) => isAdmin || trip.creatorEmail?.toLowerCase() === user.email.toLowerCase();

  const handleCreate = () => {
    if (!name.trim() || !startDate || !endDate) { alert(t("dash.err_info")); return; }
    if (new Date(endDate) < new Date(startDate)) { alert(t("dash.err_date")); return; }

    const tripId = "trip_" + Date.now();
    const autoCurrency = (destination && COUNTRY_CURRENCY[destination.country_code]) || "KRW";

    // Build allowedEmails: creator always included, plus any invitees
    const allEmails = [user.email.toLowerCase(), ...inviteEmails.map(e => e.toLowerCase()).filter(e => e !== user.email.toLowerCase())];
    const allowedEmails = Object.fromEntries(allEmails.map(e => [emailToKey(e), e]));

    const meta = {
      id: tripId,
      name: name.trim(),
      dateStart: startDate,
      dateEnd: endDate,
      currency: autoCurrency,
      creatorEmail: user.email.toLowerCase(),
      allowedEmails,
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
    updates[`trips/${tripId}`] = meta;
    updates[`tripData/${tripId}`] = { days, notes: "", expenses: [], expCats: DEFAULT_EXP_CATS, flights: { outbound: {}, inbound: {} }, accommodation: {} };

    update(ref(db), updates).then(() => {
      setShowNew(false);
      setName(""); setStartDate(""); setEndDate(""); setInviteEmails([]); setDestination(null);
    }).catch(e => { console.error("建立行程失敗", e); alert(t("dash.err_create_short") + "：" + e.message); });
  };

  const handleDelete = (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm(t("dash.confirm_delete"))) return;
    update(ref(db), { [`trips/${tripId}`]: null, [`tripData/${tripId}`]: null })
      .catch(err => alert(t("dash.err_delete") + "：" + err.message));
  };

  const handleEditStart = (e, trip) => {
    e.stopPropagation();
    setEditingTripId(trip.id);
    setEditingTripNameVal(trip.name);
    setEditingCurrencyVal(trip.currency || "KRW");
    setEditingStartDate(trip.dateStart || "");
    setEditingEndDate(trip.dateEnd || "");
    // destination may be new format { name, country_zh, country_code, lat, lng }
    // or old format { en, zh } or legacy string — normalise to new format for display
    const dest = trip.destination;
    if (!dest) { setEditingDestination(null); }
    else if (dest.name) { setEditingDestination(dest); } // new format
    else if (dest.en) { setEditingDestination({ name: dest.en, country_zh: dest.zh || dest.en }); } // prev format
    else { setEditingDestination({ name: String(dest), country_zh: "" }); } // legacy string
  };

  const handleEditSave = async (e, trip) => {
    e.stopPropagation();
    if (!editingTripNameVal.trim()) { alert(t("dash.err_name")); return; }
    if (new Date(editingEndDate) < new Date(editingStartDate)) { alert(t("dash.err_date")); return; }

    const autoCurrency = (editingDestination?.country_code && COUNTRY_CURRENCY[editingDestination.country_code])
      || trip.currency || "KRW";
    const updates = {
      [`trips/${trip.id}/name`]: editingTripNameVal.trim(),
      [`trips/${trip.id}/currency`]: autoCurrency,
      [`trips/${trip.id}/destination`]: editingDestination || null,
    };

    const datesChanged = editingStartDate !== trip.dateStart || editingEndDate !== trip.dateEnd;
    if (datesChanged) {
      updates[`trips/${trip.id}/dateStart`] = editingStartDate;
      updates[`trips/${trip.id}/dateEnd`] = editingEndDate;
      try {
        const snap = await get(ref(db, `tripData/${trip.id}/days`));
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
        updates[`tripData/${trip.id}/days`] = newDays;
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
      creatorEmail: user.email.toLowerCase(),
      allowedEmails: { ...(trip.allowedEmails || { [emailToKey(user.email)]: user.email.toLowerCase() }) },
      ...(trip.destination ? { destination: trip.destination } : {}),
    };
    try {
      const snap = await get(ref(db, `tripData/${trip.id}`));
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
      await update(ref(db), { [`trips/${newId}`]: newMeta, [`tripData/${newId}`]: newTripData });
      // Open edit modal for the new trip immediately
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

  const tripList = Object.values(trips)
    .filter(trip => canAccessTrip(trip, user.email))
    .sort((a, b) => b.id.localeCompare(a.id));

  // Always read from live trips state so share modal updates in real-time
  const activShareTrip = shareTrip ? trips[shareTrip] : null;

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

                {/* Share button — top left */}
                <div style={{ position: "absolute", top: 14, left: 16 }}>
                  <button onClick={(e) => { e.stopPropagation(); setShareTrip(trip.id); }}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    🔗 <span>{t("dash.share_btn")}</span>
                  </button>
                </div>

                {/* Edit + Delete + Duplicate — top right (creator only) */}
                {isTripCreator(trip) && (
                  <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 4 }}>
                    <button onClick={(e) => handleDuplicate(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 6px", borderRadius: 6 }}>⧉</button>
                    <button onClick={(e) => handleEditStart(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 5 }}>✏️</button>
                    <button onClick={(e) => handleDelete(e, trip.id)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 5 }}>🗑</button>
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
                        👥 {Object.keys(trip.allowedEmails || {}).length || 1} {t("dash.share_members")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}

            {tripList.length === 0 && !showNew && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                {isAdmin ? t("dash.empty") : t("dash.guest_no_trips")}
              </div>
            )}
          </div>
        )}

        {/* New trip form — admin only */}
        {isAdmin && (
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

                <div style={{ marginBottom: 12 }}>
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

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    {t("dash.invite_emails")} <span style={{ opacity: 0.6, fontSize: 11 }}>({t("dash.invite_hint")})</span>
                  </div>
                  <TagInput value={inviteEmails} onChange={setInviteEmails}
                    placeholder="example@gmail.com"
                    validate={isEmailValid} />
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
        )}
      </div>

      {/* Share modal — reads live trip data from trips state */}
      {activShareTrip && (
        <ShareModal
          trip={activShareTrip}
          currentUser={user}
          isCreator={isTripCreator(activShareTrip)}
          onClose={() => setShareTrip(null)}
        />
      )}
    </div>
  );
}
