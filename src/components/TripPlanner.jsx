import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { db } from "../lib/firebase.js";
import { ref, onValue, set as firebaseSet, update } from "firebase/database";
import { FlightCard, AccommodationCard, TimePicker } from "./Cards.jsx";
import ItemModal from "./ItemModal.jsx";
import ExpenseTracker from "./ExpenseTracker.jsx";
import { TC, TYPE_CFG } from "../lib/consts.js";

const emailToKey = email => email.toLowerCase().replace(/\./g, '_').replace(/@/g, '-');

const computeTravelers = (meta) => {
  const allowed = Object.values(meta.allowedEmails || {});
  if (allowed.length === 0) return meta.travelers || ["Traveler"]; // backward compat
  const profiles = meta.memberProfiles || {};
  return allowed.map(email => profiles[emailToKey(email)]?.displayName || email);
};

export default function TripPlanner({ tripId, tripMeta, currentUser, isAdmin, onBack }) {
  const { t } = useI18n();
  const [days, setDays] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [modalItem, setModalItem] = useState(null);
  const [modalDayId, setModalDayId] = useState(null);
  const [modalDayColor, setModalDayColor] = useState("#ccc");
  const [addingTo, setAddingTo] = useState(null);

  const [newText, setNewText] = useState("");
  const [newMapUrl, setNewMapUrl] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newType, setNewType] = useState("activity");

  const [sharedNotes, setSharedNotes] = useState([]);
  const [sharedNoteText, setSharedNoteText] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [expCats, setExpCats] = useState([]);
  const [flights, setFlights] = useState({ outbound: {}, inbound: {} });
  const [accommodation, setAccommodation] = useState({});
  const [editingDayTitle, setEditingDayTitle] = useState(null);
  const [dayTitleVal, setDayTitleVal] = useState("");
  const [editingTripTitle, setEditingTripTitle] = useState(false);
  const [tripTitleVal, setTripTitleVal] = useState(tripMeta.name ?? "");
  const [exchangeRate, setExchangeRate] = useState(null);
  const [liveTripMeta, setLiveTripMeta] = useState(tripMeta);

  const travelers = computeTravelers(liveTripMeta);
  const localCur = liveTripMeta.currency || "KRW";
  const selfTraveler = currentUser?.displayName || currentUser?.email || "Traveler";

  const lastSavedState = useRef("");

  // Map uid → current display name (for resolving old stored names)
  const uidToName = {};
  Object.values(liveTripMeta.memberProfiles || {}).forEach(p => {
    if (p.uid) uidToName[p.uid] = p.displayName || p.email;
  });

  useEffect(() => {
    (async () => {
      if (localCur === "TWD") { setExchangeRate(1); return; }
      try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/TWD`);
        const data = await res.json();
        if (data?.rates?.[localCur]) setExchangeRate(Math.round(data.rates[localCur] * 100) / 100);
      } catch (e) {
        setExchangeRate(localCur === "KRW" ? 42 : 1);
      }
    })();
  }, [localCur]);

  useEffect(() => {
    if (!db || !currentUser?.email) return;
    const key = emailToKey(currentUser.email);
    update(ref(db), {
      [`trips/${tripId}/memberProfiles/${key}`]: {
        uid: currentUser.uid,
        email: currentUser.email.toLowerCase(),
        displayName: currentUser.displayName || "",
        photoURL: currentUser.photoURL || "",
      }
    }).catch(e => console.error("Failed to write member profile", e));
    const unsub = onValue(ref(db, `trips/${tripId}`), (snap) => {
      if (snap.val()) setLiveTripMeta(snap.val());
    });
    return () => unsub();
  }, [tripId, currentUser]);

  // Sync stored name strings when selfTraveler changes (e.g. after display name edit)
  useEffect(() => {
    if (!loaded || !currentUser?.uid || !selfTraveler) return;
    setSharedNotes(prev => {
      const next = prev.map(n => n.creatorUid === currentUser.uid && n.authorName !== selfTraveler ? { ...n, authorName: selfTraveler } : n);
      return next.some((n, i) => n !== prev[i]) ? next : prev;
    });
    setExpenses(prev => {
      const next = prev.map(e => e.creatorUid === currentUser.uid && e.payer !== selfTraveler ? { ...e, payer: selfTraveler } : e);
      return next.some((e, i) => e !== prev[i]) ? next : prev;
    });
    setDays(prev => {
      let changed = false;
      const next = prev.map(day => ({
        ...day,
        items: (day.items || []).map(item => {
          const notes = (item.notes || []).map(n => {
            if (n.creatorUid === currentUser.uid && n.author !== selfTraveler) { changed = true; return { ...n, author: selfTraveler }; }
            return n;
          });
          return changed ? { ...item, notes } : item;
        })
      }));
      return changed ? next : prev;
    });
  }, [selfTraveler, currentUser?.uid, loaded]);

  useEffect(() => {
    if (tripMeta?.name) {
      document.title = `${tripTitleVal || tripMeta.name} - 旅行手帳`;
    }
    return () => {
      document.title = "我的旅行手帳";
    };
  }, [tripTitleVal, tripMeta?.name]);

  useEffect(() => {
    if (!db) { setLoaded(true); return; }
    const unsub = onValue(ref(db, `tripData/${tripId}`), (snapshot) => {
      const p = snapshot.val();
      if (p) {
        const stateStr = JSON.stringify(p);
        if (stateStr !== lastSavedState.current) {
          lastSavedState.current = stateStr;
          if (p.days) setDays(p.days);
          if (p.sharedNotes) setSharedNotes(p.sharedNotes);
          if (p.expenses) setExpenses(p.expenses);
          if (p.expCats) setExpCats(p.expCats);
          if (p.flights) setFlights(p.flights);
          if (p.accommodation) setAccommodation(p.accommodation);
        }
      }
      setLoaded(true);
    });
    return () => unsub();
  }, [tripId]);

  const persist = useCallback((d, ex, ec, f, a, sn) => {
    if (!db) return;
    const currentStateString = JSON.stringify({ days: d, expenses: ex, expCats: ec, flights: f, accommodation: a, sharedNotes: sn });
    if (lastSavedState.current !== currentStateString) {
      lastSavedState.current = currentStateString;
      firebaseSet(ref(db, `tripData/${tripId}`), {
        days: d || [], sharedNotes: sn || [], expenses: ex || [], expCats: ec || [], flights: f || { outbound: {}, inbound: {} }, accommodation: a || {}
      }).catch(e => console.error("同步至雲端失敗", e));
    }
  }, [tripId]);

  useEffect(() => {
    if (loaded && (days.length > 0 || expenses.length > 0 || sharedNotes.length > 0)) {
      persist(days, expenses, expCats, flights, accommodation, sharedNotes);
    }
  }, [days, expenses, expCats, flights, accommodation, sharedNotes, loaded, persist]);

  const addSharedNote = () => {
    if (!sharedNoteText.trim()) return;
    const n = {
      id: Date.now(),
      text: sharedNoteText.trim(),
      authorName: selfTraveler,
      creatorUid: currentUser?.uid || null,
      time: new Date().toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    };
    setSharedNotes(prev => [...prev, n]);
    setSharedNoteText("");
  };

  const sortItems = items => [...items].sort((a, b) => {
    const toMin = t => { if (!t || t === "—") return 9999; const [h, m] = t.split(":").map(Number); return isNaN(h) ? 9999 : h * 60 + (m || 0); };
    return toMin(a.startTime) - toMin(b.startTime);
  });

  const toggleDone = (dayId, itemId) => setDays(p => p.map(d => d.id === dayId ? { ...d, items: d.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : d));
  const deleteItem = (dayId, itemId) => setDays(p => p.map(d => d.id === dayId ? { ...d, items: d.items.filter(i => i.id !== itemId) } : d));

  const addItem = dayId => {
    if (!newText.trim()) return;
    const rawMap = newMapUrl.trim();
    const urlMatch = rawMap.match(/https?:\/\/[^\s\n]+/);
    const mapUrl = urlMatch ? urlMatch[0] : rawMap;
    const ni = { id: `${dayId}-${Date.now()}`, startTime: newStartTime, endTime: newEndTime, text: newText, type: newType, done: false, notes: [], mapUrl };
    setDays(p => p.map(d => d.id === dayId ? { ...d, items: sortItems([...(d.items || []), ni]) } : d));
    setNewText(""); setNewMapUrl(""); setNewStartTime("09:00"); setNewEndTime("10:00"); setNewType("activity"); setAddingTo(null);
  };

  const moveItem = (dayId, itemId, dir) => setDays(p => p.map(d => {
    if (d.id !== dayId) return d;
    const items = d.items || [];
    const idx = items.findIndex(i => i.id === itemId);
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= items.length) return d;
    const a = [...items];[a[idx], a[nIdx]] = [a[nIdx], a[idx]]; return { ...d, items: a };
  }));

  const updateModalItem = updated => {
    setDays(p => p.map(d => d.id === modalDayId ? { ...d, items: sortItems(d.items.map(i => i.id === updated.id ? updated : i)) } : d));
    setModalItem(updated);
  };

  const saveDayTitle = dayId => {
    if (dayTitleVal.trim()) setDays(p => p.map(d => d.id === dayId ? { ...d, title: dayTitleVal.trim() } : d));
    setEditingDayTitle(null);
  };

  const saveTripTitle = () => {
    if (tripTitleVal.trim() && tripTitleVal.trim() !== tripMeta.name) {
      if (db) {
        update(ref(db), { [`trips/${tripId}/name`]: tripTitleVal.trim() }).catch(e => console.error(e));
      }
      tripMeta.name = tripTitleVal.trim();
    } else {
      setTripTitleVal(tripMeta.name);
    }
    setEditingTripTitle(false);
  };

  const totalItems = days.reduce((s, d) => s + (d.items?.length || 0), 0);
  const doneItems = days.reduce((s, d) => s + (d.items?.filter(i => i.done)?.length || 0), 0);

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>載入中...</div>;

  const TABS = [{ key: "itinerary", label: t("trip.plan_tab") }, { key: "info", label: t("trip.info_tab") }, { key: "expense", label: t("trip.expense_tab") }, { key: "notes", label: t("trip.notes_tab") }, { key: "members", label: t("trip.members_tab") }];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "'Noto Sans TC','Noto Sans KR',sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#2D2926,#3D3530)", padding: "16px 20px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, color: "var(--btn-text)", padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>{t("trip.back_dash")}</button>
            <div style={{ fontSize: 11, color: "#C4A882" }}>{tripMeta.dateStart} — {tripMeta.dateEnd}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              {editingTripTitle ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input value={tripTitleVal} onChange={e => setTripTitleVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTripTitle()} autoFocus
                    style={{ fontSize: 22, fontWeight: 700, border: "none", borderBottom: "2px solid #C4A882", outline: "none", background: "transparent", color: "#FAF7F2", width: "100%", padding: "2px 0" }} />
                  <button onClick={saveTripTitle} style={{ padding: "4px 10px", background: "#C4A882", color: "var(--text-main)", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>{t("dash.save")}</button>
                </div>
              ) : (
                <h1 onClick={() => setEditingTripTitle(true)} style={{ margin: 0, fontSize: 22, color: "#FAF7F2", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  {tripTitleVal} ✈️ <span style={{ fontSize: 13, opacity: 0.5 }}>✏️</span>
                </h1>
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#FAF7F2", opacity: 0.8 }}>{doneItems}/{totalItems} {t("trip.completed")}</div>
          </div>

          <div style={{ marginTop: 10, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${totalItems ? (doneItems / totalItems) * 100 : 0}%`, background: "linear-gradient(90deg,#C4A882,#E8CFA8)", borderRadius: 2, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: activeTab === t.key ? "rgba(255,255,255,0.15)" : "transparent", color: activeTab === t.key ? "#FAF7F2" : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 0" }}>
        {activeTab === "info" && (
          <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 12 }}>{t("trip.flight_info")}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, marginTop: 10 }}>{t("trip.flight_out")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder={t("trip.flight_code")} value={flights.outbound?.code || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, code: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_time")} value={flights.outbound?.depart || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, depart: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder={t("trip.flight_from_code")} value={flights.outbound?.from || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, from: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_to_code")} value={flights.outbound?.to || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, to: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <input placeholder={t("trip.flight_from_name")} value={flights.outbound?.fromName || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, fromName: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_to_name")} value={flights.outbound?.toName || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, toName: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <FlightCard flight={flights.outbound} direction="out" />

              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, marginTop: 24 }}>{t("trip.flight_in")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder={t("trip.flight_code")} value={flights.inbound?.code || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, code: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_time")} value={flights.inbound?.depart || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, depart: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder={t("trip.flight_from_code")} value={flights.inbound?.from || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, from: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_to_code")} value={flights.inbound?.to || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, to: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <input placeholder={t("trip.flight_from_name")} value={flights.inbound?.fromName || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, fromName: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
                <input placeholder={t("trip.flight_to_name")} value={flights.inbound?.toName || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, toName: e.target.value } })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} />
              </div>
              <FlightCard flight={flights.inbound} direction="in" />
            </div>

            <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 12 }}>{t("trip.accom_info")}</div>
              <input placeholder={t("trip.accom_name")} value={accommodation?.name || ""} onChange={e => setAccommodation({ ...accommodation, name: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder={t("trip.accom_title")} value={accommodation?.title || ""} onChange={e => setAccommodation({ ...accommodation, title: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder={t("trip.accom_loc")} value={accommodation?.location || ""} onChange={e => setAccommodation({ ...accommodation, location: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder={t("trip.accom_detail")} value={accommodation?.details || ""} onChange={e => setAccommodation({ ...accommodation, details: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder={t("trip.accom_feats")} value={(accommodation?.features || []).join(",")} onChange={e => setAccommodation({ ...accommodation, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder={t("trip.accom_url")} value={accommodation?.url || ""} onChange={e => setAccommodation({ ...accommodation, url: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none", marginBottom: 16 }} />
              <AccommodationCard accom={accommodation} />
            </div>
          </div>
        )}

        {activeTab === "notes" && (() => {
          // Notes tab: private per user — each person sees only their own
          const myNotes = sharedNotes.filter(n => !n.creatorUid || n.creatorUid === currentUser?.uid);
          return (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{t("trip.notes_title")}</div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--bg-accent)", color: "var(--text-muted)" }}>🔒</span>
                </div>

                {myNotes.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>{t("trip.shared_notes_empty")}</div>
                )}

                {myNotes.map(n => (
                  <div key={n.id} style={{ background: "var(--bg-accent)", borderRadius: 10, padding: "10px 14px", marginBottom: 10, borderLeft: "3px solid var(--btn-bg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{n.time}</span>
                      <button onClick={() => setSharedNotes(prev => prev.filter(x => x.id !== n.id))}
                        style={{ border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.6 }}>{n.text}</div>
                  </div>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    value={sharedNoteText}
                    onChange={e => setSharedNoteText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addSharedNote()}
                    placeholder={t("trip.shared_note_placeholder")}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--border-main)", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }}
                  />
                  <button onClick={addSharedNote}
                    style={{ padding: "8px 16px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
                    {t("dash.add_btn")}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === "expense" && <ExpenseTracker expenses={expenses} setExpenses={setExpenses} categories={expCats} setCategories={setExpCats} exchangeRate={exchangeRate} travelers={travelers} localCur={localCur} currentUser={currentUser} selfTraveler={selfTraveler} uidToName={uidToName} />}

        {activeTab === "itinerary" && (
          <div>
            {days.map((day, dayIdx) => (
              <div key={day.id} style={{ marginBottom: 22, animation: `fadeIn 0.3s ease ${dayIdx * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: day.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--text-main)", boxShadow: `0 3px 10px ${day.color}44` }}>{dayIdx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{day.date}</div>
                    {editingDayTitle === day.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input value={dayTitleVal} onChange={e => setDayTitleVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveDayTitle(day.id)} autoFocus
                          style={{ fontSize: 15, fontWeight: 700, border: "none", borderBottom: `2px solid ${day.color}`, padding: "2px 0", outline: "none", background: "transparent", color: "var(--text-main)", width: "100%" }} />
                        <button onClick={() => saveDayTitle(day.id)} style={{ padding: "2px 8px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>✓</button>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingDayTitle(day.id); setDayTitleVal(day.title); }} style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", cursor: "pointer" }}>
                        {day.title} <span style={{ fontSize: 10, color: "#ddd" }}>✏️</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(day.items || []).filter(i => i.done).length}/{(day.items || []).length}</div>
                </div>

                <div style={{ background: "var(--bg-card)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                  {(day.items || []).map((item, idx) => {
                    const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;
                    const nc = (item.notes || []).length;
                    return (
                      <div key={item.id} style={{ borderBottom: idx < day.items.length - 1 ? "1px solid #F5F2ED" : "none", display: "flex", alignItems: "center", opacity: item.done ? 0.4 : 1, transition: "opacity 0.3s" }}>
                        <button onClick={() => toggleDone(day.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? day.color : "#ddd"}`, background: item.done ? day.color : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 0 14px", padding: 0 }}>
                          {item.done && <span style={{ color: "var(--btn-text)", fontSize: 11 }}>✓</span>}
                        </button>
                        <div onClick={() => { setModalDayId(day.id); setModalItem(item); setModalDayColor(day.color); }} style={{ flex: 1, padding: "12px 10px", cursor: "pointer", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{item.startTime}–{item.endTime}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: cfg.bg }}>{cfg.emoji}</span>
                            {nc > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--border-main)", color: "var(--text-main)" }}>💬{nc}</span>}
                            {item.mapUrl && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E3F2FD", color: "#4A90D9" }}>📍</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-main)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</div>
                        </div>
                        <div style={{ display: "flex", flexShrink: 0, opacity: 0.35, paddingRight: 10 }}>
                          <button onClick={() => moveItem(day.id, item.id, -1)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 9, padding: 0, color: "var(--text-muted)" }}>▲</button>
                          <button onClick={() => moveItem(day.id, item.id, 1)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 9, padding: 0, color: "var(--text-muted)" }}>▼</button>
                          <button onClick={() => deleteItem(day.id, item.id)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 11, padding: 0, color: "var(--text-main)" }}>🗑</button>
                        </div>
                      </div>
                    );
                  })}

                  {addingTo === day.id ? (
                    <div style={{ padding: 14, borderTop: "1px dashed var(--border-light)", animation: "fadeIn 0.2s ease" }}>
                      <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-end" }}>
                        <TimePicker label={t("trip.depart")} value={newStartTime} onChange={setNewStartTime} />
                        <TimePicker label={t("trip.arrive")} value={newEndTime} onChange={setNewEndTime} />
                      </div>
                      <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(day.id)} placeholder={t("trip.item_placeholder")} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-main)", borderRadius: 8, fontSize: 16, outline: "none", marginBottom: 8, color: "var(--text-main)", background: "var(--input-bg)" }} autoFocus />
                      <input value={newMapUrl} onChange={e => setNewMapUrl(e.target.value)} placeholder={`📍 ${t("trip.map_title")} (${t("trip.map_optional")})`} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-main)", borderRadius: 8, fontSize: 16, outline: "none", marginBottom: 10, color: "var(--text-main)", background: "var(--input-bg)" }} />
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                        {Object.entries(TYPE_CFG).map(([k, v]) => (
                          <button key={k} onClick={() => setNewType(k)} style={{ padding: "3px 10px", borderRadius: 10, border: newType === k ? "2px solid var(--btn-bg)" : "1px solid var(--border-main)", background: newType === k ? v.bg : "var(--bg-card)", fontSize: 10, cursor: "pointer", color: "var(--text-main)" }}>{v.emoji} {v.label}</button>
                        ))}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          <button onClick={() => addItem(day.id)} style={{ padding: "5px 14px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{t("dash.add_btn")}</button>
                          <button onClick={() => { setAddingTo(null); setNewText(""); setNewMapUrl(""); }} style={{ padding: "5px 12px", background: "var(--btn-hover)", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>{t("dash.cancel")}</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(day.id)} style={{ width: "100%", padding: "11px", border: "none", borderTop: "1px dashed var(--border-main)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>{t("trip.add_item")}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "members" && (() => {
          const allowedEmails = Object.values(liveTripMeta.allowedEmails || {});
          const profiles = liveTripMeta.memberProfiles || {};
          if (allowedEmails.length === 0) {
            return (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  {t("trip.member_legacy")}
                </div>
              </div>
            );
          }
          return (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 16 }}>{t("trip.members_title")}</div>
                {allowedEmails.map((email, idx) => {
                  const key = emailToKey(email);
                  const profile = profiles[key];
                  const hasJoined = !!profile?.uid;
                  const isCreator = email.toLowerCase() === liveTripMeta.creatorEmail?.toLowerCase();
                  const isMe = email.toLowerCase() === currentUser?.email?.toLowerCase();
                  const displayName = profile?.displayName || (hasJoined ? email.split('@')[0] : null);
                  return (
                    <div key={email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: idx < allowedEmails.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                      {profile?.photoURL
                        ? <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 38, height: 38, borderRadius: "50%", background: hasJoined ? "var(--btn-bg)" : "var(--border-main)", color: "var(--btn-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                            {(displayName || email)[0].toUpperCase()}
                          </div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: hasJoined ? "var(--text-main)" : "var(--text-muted)" }}>
                            {displayName || email}
                          </span>
                          {isCreator && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "#FFF3E0", color: "#E65100", fontWeight: 700 }}>{t("dash.share_creator")}</span>}
                          {isMe && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "var(--bg-accent)", color: "var(--text-muted)", fontWeight: 600 }}>{t("dash.share_you")}</span>}
                          {!hasJoined && <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "var(--border-light)", color: "var(--text-muted)" }}>{t("trip.member_not_joined")}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {modalItem && <ItemModal item={modalItem} dayColor={modalDayColor} travelers={travelers} currentUser={currentUser} selfTraveler={selfTraveler} uidToName={uidToName} onClose={() => setModalItem(null)} onUpdate={updateModalItem} />}
    </div>
  );
}
