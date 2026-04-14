import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { db } from "../lib/firebase.js";
import { ref, onValue, set as firebaseSet, update, onDisconnect, remove } from "firebase/database";
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
  const [activeTab, setActiveTab] = useState("packing");
  const [itinMode, setItinMode] = useState("list"); // "list" | "timeline" | "map"
  const [onlineMembers, setOnlineMembers] = useState({});
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
  const [packingList, setPackingList] = useState([]);
  const [packingText, setPackingText] = useState("");
  const [weatherByDate, setWeatherByDate] = useState({});
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
    const rawDest = liveTripMeta.destination;
    if (!rawDest) return;
    (async () => {
      try {
        let latitude, longitude;
        if (rawDest.latitude && rawDest.longitude) {
          // New format: lat/lng stored directly
          latitude = rawDest.latitude; longitude = rawDest.longitude;
        } else {
          // Legacy: geocode by name string
          const name = typeof rawDest === "object" ? (rawDest.en || rawDest.name) : rawDest;
          if (!name) return;
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
          const geoData = await geoRes.json();
          const loc = geoData.results?.[0];
          if (!loc) return;
          latitude = loc.latitude; longitude = loc.longitude;
        }
        // Forecast API only covers today → today+16 days; skip if trip is outside that window
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const maxForecast = new Date(today); maxForecast.setDate(today.getDate() + 16);
        const tripStart = new Date(liveTripMeta.dateStart);
        const tripEnd = new Date(liveTripMeta.dateEnd);
        if (tripEnd < today || tripStart > maxForecast) return;
        const fmt = d => d.toISOString().split('T')[0];
        const start = fmt(tripStart < today ? today : tripStart);
        const end = fmt(tripEnd > maxForecast ? maxForecast : tripEnd);
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${start}&end_date=${end}`);
        const wData = await wRes.json();
        if (!wData.daily) return;
        const map = {};
        wData.daily.time.forEach((date, i) => {
          map[date] = { code: wData.daily.weather_code[i], max: Math.round(wData.daily.temperature_2m_max[i]), min: Math.round(wData.daily.temperature_2m_min[i]) };
        });
        setWeatherByDate(map);
      } catch (e) {
        // silent
      }
    })();
  }, [liveTripMeta.destination, liveTripMeta.dateStart, liveTripMeta.dateEnd]);

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

  // Realtime presence — write on connect, remove on disconnect/unmount
  useEffect(() => {
    if (!db || !currentUser?.uid || !tripId) return;
    const presRef = ref(db, `presence/${tripId}/${currentUser.uid}`);
    const connRef = ref(db, '.info/connected');
    const unsubConn = onValue(connRef, snap => {
      if (snap.val() === true) {
        firebaseSet(presRef, { name: currentUser.displayName || currentUser.email || "Traveler", uid: currentUser.uid });
        onDisconnect(presRef).remove();
      }
    });
    const unsubPres = onValue(ref(db, `presence/${tripId}`), snap => setOnlineMembers(snap.val() || {}));
    return () => { unsubConn(); unsubPres(); remove(presRef); };
  }, [tripId, currentUser?.uid]);

  // Add default packing items for new users (runs once after load)
  const packingInitialized = useRef(false);
  useEffect(() => {
    if (!loaded || packingInitialized.current || !currentUser?.uid) return;
    packingInitialized.current = true;
    const myItems = packingList.filter(p => p.creatorUid === currentUser.uid);
    if (myItems.length === 0) {
      const now = Date.now();
      setPackingList(prev => [
        ...prev,
        { id: now, text: "護照", done: false, creatorUid: currentUser.uid },
        { id: now + 1, text: "eSIM", done: false, creatorUid: currentUser.uid },
      ]);
    }
  }, [loaded, currentUser?.uid]);

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
          if (p.packingList) setPackingList(p.packingList);
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

  const persist = useCallback((d, ex, ec, f, a, sn, pl) => {
    if (!db) return;
    const currentStateString = JSON.stringify({ days: d, expenses: ex, expCats: ec, flights: f, accommodation: a, sharedNotes: sn, packingList: pl });
    if (lastSavedState.current !== currentStateString) {
      lastSavedState.current = currentStateString;
      firebaseSet(ref(db, `tripData/${tripId}`), {
        days: d || [], sharedNotes: sn || [], packingList: pl || [], expenses: ex || [], expCats: ec || [], flights: f || { outbound: {}, inbound: {} }, accommodation: a || {}
      }).catch(e => console.error("同步至雲端失敗", e));
    }
  }, [tripId]);

  useEffect(() => {
    if (loaded && (days.length > 0 || expenses.length > 0 || sharedNotes.length > 0 || packingList.length > 0)) {
      persist(days, expenses, expCats, flights, accommodation, sharedNotes, packingList);
    }
  }, [days, expenses, expCats, flights, accommodation, sharedNotes, packingList, loaded, persist]);

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

  const dragItemRef = useRef(null);
  const dragOverRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const reorderItem = (dayId, fromId, toId) => {
    if (fromId === toId) return;
    setDays(prev => prev.map(d => {
      if (d.id !== dayId) return d;
      const items = [...(d.items || [])];
      const fi = items.findIndex(i => i.id === fromId);
      const ti = items.findIndex(i => i.id === toId);
      if (fi === -1 || ti === -1) return d;
      const [moved] = items.splice(fi, 1);
      items.splice(ti, 0, moved);
      return { ...d, items };
    }));
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

  const TABS = [{ key: "packing", label: t("trip.packing_tab") }, { key: "itinerary", label: t("trip.plan_tab") }, { key: "info", label: t("trip.info_tab") }, { key: "expense", label: t("trip.expense_tab") }, { key: "notes", label: t("trip.notes_tab") }, { key: "members", label: t("trip.members_tab") }];
  const WMO_EMOJI = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "❄️", 73: "❄️", 75: "❄️", 80: "🌦️", 81: "🌦️", 82: "⛈️", 95: "⛈️", 96: "⛈️", 99: "⛈️" };
  const getWeatherEmoji = (code) => { if (code == null) return null; const keys = Object.keys(WMO_EMOJI).map(Number).sort((a, b) => b - a); const k = keys.find(k => code >= k); return WMO_EMOJI[k] || "🌡️"; };

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
          {(() => {
            const others = Object.values(onlineMembers).filter(m => m.uid !== currentUser?.uid);
            if (others.length === 0) return null;
            return (
              <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{t("trip.online_now")}：</span>
                {others.map(m => (
                  <span key={m.uid} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(80,200,100,0.25)", color: "#90EE90", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
                    {m.name}
                  </span>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: 3, marginTop: 10, overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flexShrink: 0, padding: "7px 10px", borderRadius: 8, border: "none", background: activeTab === tab.key ? "rgba(255,255,255,0.15)" : "transparent", color: activeTab === tab.key ? "#FAF7F2" : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>{tab.label}</button>
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", borderRadius: 9, padding: 2, border: "1px solid var(--border-main)" }}>
                {[["list", t("trip.list_mode")], ["timeline", t("trip.timeline_mode")]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setItinMode(mode)} style={{ padding: "4px 11px", borderRadius: 7, border: "none", background: itinMode === mode ? "var(--btn-bg)" : "transparent", color: itinMode === mode ? "var(--btn-text)" : "var(--text-muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{label}</button>
                ))}
              </div>
            </div>
            {days.map((day, dayIdx) => (
              <div key={day.id} style={{ marginBottom: 22, animation: `fadeIn 0.3s ease ${dayIdx * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: day.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--text-main)", boxShadow: `0 3px 10px ${day.color}44` }}>{dayIdx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{day.date}</span>
                      {(() => {
                        // Extract YYYY-MM-DD from day object for weather lookup
                        const dateKey = liveTripMeta.dateStart
                          ? (() => {
                              const d = new Date(liveTripMeta.dateStart);
                              d.setDate(d.getDate() + dayIdx);
                              return d.toISOString().split("T")[0];
                            })()
                          : null;
                        const w = dateKey && weatherByDate[dateKey];
                        if (!w) return null;
                        return (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                            {getWeatherEmoji(w.code)} <span style={{ fontSize: 10 }}>{w.max}°/{w.min}°</span>
                          </span>
                        );
                      })()}
                    </div>
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
                  {(() => {
                    const total = (day.items || []).length;
                    const done = (day.items || []).filter(i => i.done).length;
                    const pct = total > 0 ? done / total : 0;
                    const color = pct === 1 ? "#4CAF50" : pct > 0 ? day.color : "var(--border-main)";
                    return (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 32 }}>
                        <span style={{ fontSize: 10, color: pct === 1 ? "#4CAF50" : "var(--text-muted)", fontWeight: 600 }}>{done}/{total}</span>
                        <div style={{ width: 32, height: 3, background: "var(--border-light)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {itinMode === "timeline" ? (() => {
                  const withTime = (day.items || []).filter(i => i.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const noTime = (day.items || []).filter(i => !i.startTime);
                  const renderTimelineItem = (item, isLast) => {
                    const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;
                    const nc = (item.notes || []).length;
                    return (
                      <div key={item.id} style={{ display: "flex", gap: 0, opacity: item.done ? 0.45 : 1 }}>
                        <div style={{ width: 52, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                          <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, lineHeight: 1 }}>{item.startTime || ""}</span>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.done ? day.color : "var(--border-main)", border: `2px solid ${day.color}`, margin: "4px 0", flexShrink: 0 }} />
                          {!isLast && <div style={{ width: 2, flex: 1, background: "var(--border-light)", minHeight: 20 }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 14, paddingLeft: 6 }}>
                          <div onClick={() => { setModalDayId(day.id); setModalItem(item); setModalDayColor(day.color); }} style={{ background: "var(--bg-card)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: cfg.bg }}>{cfg.emoji}</span>
                              {item.endTime && <span style={{ fontSize: 9, color: "var(--text-muted)" }}>— {item.endTime}</span>}
                              {nc > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--border-main)", color: "var(--text-main)" }}>💬{nc}</span>}
                              {item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "#4A90D9", textDecoration: "none" }}>📍</a>}
                              <button onClick={e => { e.stopPropagation(); toggleDone(day.id, item.id); }} style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.done ? day.color : "var(--border-main)"}`, background: item.done ? day.color : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                                {item.done && <span style={{ color: "var(--btn-text)", fontSize: 10 }}>✓</span>}
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-main)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4 }}>{item.text}</div>
                          </div>
                        </div>
                      </div>
                    );
                  };
                  return (
                    <div style={{ paddingTop: 8, paddingLeft: 4 }}>
                      {withTime.map((item, i) => renderTimelineItem(item, i === withTime.length - 1 && noTime.length === 0))}
                      {noTime.length > 0 && (
                        <>
                          {withTime.length > 0 && <div style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 52, marginBottom: 6, marginTop: 2 }}>{t("trip.timeline_no_time")}</div>}
                          <div style={{ background: "var(--bg-card)", borderRadius: 12, overflow: "hidden", marginLeft: 52 }}>
                            {noTime.map((item, idx) => {
                              const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;
                              const nc = (item.notes || []).length;
                              return (
                                <div key={item.id} style={{ borderBottom: idx < noTime.length - 1 ? "1px solid var(--border-light)" : "none", display: "flex", alignItems: "center", opacity: item.done ? 0.45 : 1 }}>
                                  <button onClick={() => toggleDone(day.id, item.id)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.done ? day.color : "#ddd"}`, background: item.done ? day.color : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 0 12px", padding: 0 }}>
                                    {item.done && <span style={{ color: "var(--btn-text)", fontSize: 10 }}>✓</span>}
                                  </button>
                                  <div onClick={() => { setModalDayId(day.id); setModalItem(item); setModalDayColor(day.color); }} style={{ flex: 1, padding: "11px 10px", cursor: "pointer", minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                                      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: cfg.bg }}>{cfg.emoji}</span>
                                      {nc > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--border-main)", color: "var(--text-main)" }}>💬{nc}</span>}
                                    </div>
                                    <div style={{ fontSize: 13, color: "var(--text-main)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</div>
                                  </div>
                                  {item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 14, color: "#4A90D9", textDecoration: "none", flexShrink: 0, padding: "0 4px" }}>📍</a>}
                                  <button onClick={() => deleteItem(day.id, item.id)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 11, padding: 0, color: "var(--text-main)", opacity: 0.4, paddingRight: 10 }}>🗑</button>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })() : (
                <div style={{ background: "var(--bg-card)", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                  {(day.items || []).map((item, idx) => {
                    const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;
                    const nc = (item.notes || []).length;
                    return (
                      <div key={item.id}
                        draggable
                        onDragStart={() => { dragItemRef.current = { dayId: day.id, itemId: item.id }; setDraggingId(item.id); }}
                        onDragOver={e => { e.preventDefault(); dragOverRef.current = item.id; }}
                        onDrop={() => { if (dragItemRef.current?.dayId === day.id) reorderItem(day.id, dragItemRef.current.itemId, item.id); dragItemRef.current = null; dragOverRef.current = null; setDraggingId(null); }}
                        onDragEnd={() => { dragItemRef.current = null; dragOverRef.current = null; setDraggingId(null); }}
                        style={{ borderBottom: idx < day.items.length - 1 ? "1px solid #F5F2ED" : "none", display: "flex", alignItems: "center", opacity: draggingId === item.id ? 0.35 : item.done ? 0.4 : 1, transition: "opacity 0.2s", cursor: "grab" }}>
                        <span style={{ fontSize: 11, color: "var(--border-main)", padding: "0 6px 0 10px", cursor: "grab", flexShrink: 0, userSelect: "none" }}>⠿</span>
                        <button onClick={() => toggleDone(day.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? day.color : "#ddd"}`, background: item.done ? day.color : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          {item.done && <span style={{ color: "var(--btn-text)", fontSize: 11 }}>✓</span>}
                        </button>
                        <div onClick={() => { setModalDayId(day.id); setModalItem(item); setModalDayColor(day.color); }} style={{ flex: 1, padding: "12px 8px", cursor: "pointer", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{item.startTime}–{item.endTime}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: cfg.bg }}>{cfg.emoji}</span>
                            {nc > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--border-main)", color: "var(--text-main)" }}>💬{nc}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-main)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</div>
                        </div>
                        {item.mapUrl && (
                          <a href={item.mapUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ fontSize: 14, color: "#4A90D9", textDecoration: "none", flexShrink: 0, padding: "0 4px" }}>📍</a>
                        )}
                        <button onClick={() => deleteItem(day.id, item.id)} style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, padding: 0, color: "var(--text-muted)", flexShrink: 0, opacity: 0.5 }}>🗑</button>
                      </div>
                    );
                  })}
                </div>)}

                {addingTo === day.id ? (
                  <div style={{ padding: 14, marginTop: 2, background: "var(--bg-card)", borderRadius: 12, animation: "fadeIn 0.2s ease" }}>
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
                  <button onClick={() => setAddingTo(day.id)} style={{ width: "100%", padding: "11px", border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", marginTop: 4 }}>{t("trip.add_item")}</button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "packing" && (() => {
          const myPacking = packingList.filter(n => !n.creatorUid || n.creatorUid === currentUser?.uid);
          const addPacking = () => {
            if (!packingText.trim()) return;
            setPackingList(prev => [...prev, { id: Date.now(), text: packingText.trim(), done: false, creatorUid: currentUser?.uid || null }]);
            setPackingText("");
          };
          const togglePacking = (id) => setPackingList(prev => prev.map(p => p.id === id ? { ...p, done: !p.done } : p));
          const deletePacking = (id) => setPackingList(prev => prev.filter(p => p.id !== id));
          return (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{t("trip.packing_tab")}</div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "var(--bg-accent)", color: "var(--text-muted)" }}>🔒</span>
                </div>
                {myPacking.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>{t("trip.packing_empty")}</div>
                )}
                {myPacking.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                    <button onClick={() => togglePacking(p.id)}
                      style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${p.done ? "var(--btn-bg)" : "var(--border-main)"}`, background: p.done ? "var(--btn-bg)" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      {p.done && <span style={{ color: "var(--btn-text)", fontSize: 10 }}>✓</span>}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-main)", textDecoration: p.done ? "line-through" : "none", opacity: p.done ? 0.5 : 1 }}>{p.text}</span>
                    <button onClick={() => deletePacking(p.id)}
                      style={{ border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input value={packingText} onChange={e => setPackingText(e.target.value)} onKeyDown={e => e.key === "Enter" && addPacking()}
                    placeholder={t("trip.packing_add")}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--border-main)", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--input-bg)", color: "var(--text-main)" }} />
                  <button onClick={addPacking}
                    style={{ padding: "8px 16px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
                    {t("dash.add_btn")}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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
