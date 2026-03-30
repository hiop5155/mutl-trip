import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../lib/firebase.js";
import { ref, onValue, set as firebaseSet } from "firebase/database";
import { FlightCard, AccommodationCard, TimePicker } from "./Cards.jsx";
import ItemModal from "./ItemModal.jsx";
import ExpenseTracker from "./ExpenseTracker.jsx";
import { TC, TYPE_CFG } from "../lib/consts.js";

export default function TripPlanner({ tripId, tripMeta, onBack }) {
  const [days, setDays] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [modalItem, setModalItem] = useState(null);
  const [modalDayId, setModalDayId] = useState(null);
  const [modalDayColor, setModalDayColor] = useState("#ccc");
  const [addingTo, setAddingTo] = useState(null);
  
  const [newText, setNewText] = useState("");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newType, setNewType] = useState("activity");
  
  const [notes, setNotes] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [expCats, setExpCats] = useState([]);
  const [flights, setFlights] = useState({ outbound: {}, inbound: {} });
  const [accommodation, setAccommodation] = useState({});
  const [editingDayTitle, setEditingDayTitle] = useState(null);
  const [dayTitleVal, setDayTitleVal] = useState("");
  const [exchangeRate, setExchangeRate] = useState(null);

  const travelers = tripMeta.travelers || ["Traveler"];
  const localCur = tripMeta.currency || "KRW";

  const lastSavedState = useRef(""); 

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
    if (tripMeta?.name) {
      document.title = `${tripMeta.name} - 旅行手帳`;
    }
    return () => {
      document.title = "我的旅行手帳";
    };
  }, [tripMeta?.name]);

  useEffect(() => {
    if (!db) { setLoaded(true); return; }
    const unsub = onValue(ref(db, `tripData/${tripId}`), (snapshot) => {
      const p = snapshot.val();
      if (p) {
        const stateStr = JSON.stringify(p);
        if (stateStr !== lastSavedState.current) {
          lastSavedState.current = stateStr;
          if (p.days) setDays(p.days);
          if (p.notes !== undefined) setNotes(p.notes || "");
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

  const persist = useCallback((d, n, ex, ec, f, a) => {
    if (!db) return;
    const currentStateString = JSON.stringify({ days: d, notes: n, expenses: ex, expCats: ec, flights: f, accommodation: a });
    if (lastSavedState.current !== currentStateString) {
      lastSavedState.current = currentStateString;
      firebaseSet(ref(db, `tripData/${tripId}`), { 
        days: d || [], notes: n || "", expenses: ex || [], expCats: ec || [], flights: f || {outbound:{},inbound:{}}, accommodation: a || {} 
      }).catch(e => console.error("同步至雲端失敗", e));
    }
  }, [tripId]);

  useEffect(() => { 
    if (loaded && (days.length > 0 || notes || expenses.length > 0)) {
      persist(days, notes, expenses, expCats, flights, accommodation); 
    }
  }, [days, notes, expenses, expCats, flights, accommodation, loaded, persist]);

  const sortItems = items => [...items].sort((a, b) => {
    const toMin = t => { if (!t || t === "—") return 9999; const [h, m] = t.split(":").map(Number); return isNaN(h) ? 9999 : h * 60 + (m || 0); };
    return toMin(a.startTime) - toMin(b.startTime);
  });

  const toggleDone = (dayId, itemId) => setDays(p => p.map(d => d.id === dayId ? { ...d, items: d.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) } : d));
  const deleteItem = (dayId, itemId) => setDays(p => p.map(d => d.id === dayId ? { ...d, items: d.items.filter(i => i.id !== itemId) } : d));

  const addItem = dayId => {
    if (!newText.trim()) return;
    const ni = { id: `${dayId}-${Date.now()}`, startTime: newStartTime, endTime: newEndTime, text: newText, type: newType, done: false, notes: [], mapUrl: "" };
    setDays(p => p.map(d => d.id === dayId ? { ...d, items: sortItems([...(d.items||[]), ni]) } : d));
    setNewText(""); setNewStartTime("09:00"); setNewEndTime("10:00"); setNewType("activity"); setAddingTo(null);
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

  const totalItems = days.reduce((s, d) => s + (d.items?.length || 0), 0);
  const doneItems = days.reduce((s, d) => s + (d.items?.filter(i => i.done)?.length || 0), 0);

  if (!loaded) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>載入中...</div>;

  const TABS = [{ key: "itinerary", label: "📅 行程" }, { key: "info", label: "✈️ 資訊" }, { key: "expense", label: "💰 記帳" }, { key: "notes", label: "📝 備忘" }];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", fontFamily: "'Noto Sans TC','Noto Sans KR',sans-serif", paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#2D2926,#3D3530)", padding: "16px 20px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, color: "white", padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>← 返回總覽</button>
            <div style={{ fontSize: 11, color: "#C4A882" }}>{tripMeta.dateStart} — {tripMeta.dateEnd}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, color: "#FAF7F2", fontWeight: 700 }}>{tripMeta.name} ✈️</h1>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#FAF7F2", opacity: 0.8 }}>{doneItems}/{totalItems} 完成</div>
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
            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2926", marginBottom: 12 }}>✈️ 航班資訊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 8, marginTop: 10 }}>去程航班</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder="航班代碼 (例 TW668)" value={flights.outbound?.code || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, code: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="出發時間 (例 5/20 14:00)" value={flights.outbound?.depart || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, depart: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder="出發航廈 (例 TSA T1)" value={flights.outbound?.from || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, from: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="到達機場 (例 GMP I)" value={flights.outbound?.to || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, to: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <input placeholder="登機機場名 (例 台北松山)" value={flights.outbound?.fromName || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, fromName: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="抵達機場名 (例 首爾金浦)" value={flights.outbound?.toName || ""} onChange={e => setFlights({ ...flights, outbound: { ...flights.outbound, toName: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <FlightCard flight={flights.outbound} direction="out" />

              <div style={{ fontSize: 13, fontWeight: 600, color: "#666", marginBottom: 8, marginTop: 24 }}>回程航班</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder="航班代碼 (例 TW667)" value={flights.inbound?.code || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, code: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="出發時間 (例 5/25 11:20)" value={flights.inbound?.depart || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, depart: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input placeholder="出發機場 (例 GMP I)" value={flights.inbound?.from || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, from: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="抵達機場 (例 TSA T1)" value={flights.inbound?.to || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, to: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <input placeholder="登機機場名 (例 首爾金浦)" value={flights.inbound?.fromName || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, fromName: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
                <input placeholder="抵達機場名 (例 台北松山)" value={flights.inbound?.toName || ""} onChange={e => setFlights({ ...flights, inbound: { ...flights.inbound, toName: e.target.value }})} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none" }} />
              </div>
              <FlightCard flight={flights.inbound} direction="in" />
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2926", marginBottom: 12 }}>🏠 住宿資訊</div>
              <input placeholder="住宿名稱 (例 Hee's House)" value={accommodation?.name || ""} onChange={e => setAccommodation({ ...accommodation, name: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder="副標題/短述 (例 弘益大學入口站 5 分鐘)" value={accommodation?.title || ""} onChange={e => setAccommodation({ ...accommodation, title: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder="交通地點指引 (例 弘大站 6 號出口步行 5 分鐘)" value={accommodation?.location || ""} onChange={e => setAccommodation({ ...accommodation, location: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder="詳細房型描述 (例 1 間臥室 · 可住 2 人)" value={accommodation?.details || ""} onChange={e => setAccommodation({ ...accommodation, details: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder="房源標籤 (用逗號隔開)：自助入住,可寄放行李" value={(accommodation?.features || []).join(",")} onChange={e => setAccommodation({ ...accommodation, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 8 }} />
              <input placeholder="相關連結 (Airbnb/Booking 網址)" value={accommodation?.url || ""} onChange={e => setAccommodation({ ...accommodation, url: e.target.value })} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #EDE8E0", fontSize: 13, outline: "none", marginBottom: 16 }} />
              <AccommodationCard accom={accommodation} />
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2926", marginBottom: 12 }}>📝 旅行備忘錄</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="WiFi密碼、換錢地點、想買的東西..." style={{ width: "100%", minHeight: 180, border: "1px solid #EDE8E0", borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.8, resize: "vertical", outline: "none", color: "#2D2926", background: "#FAFAF8" }} />
            </div>
          </div>
        )}

        {activeTab === "expense" && <ExpenseTracker expenses={expenses} setExpenses={setExpenses} categories={expCats} setCategories={setExpCats} exchangeRate={exchangeRate} travelers={travelers} localCur={localCur} />}

        {activeTab === "itinerary" && (
          <div>
            {days.map((day, dayIdx) => (
              <div key={day.id} style={{ marginBottom: 22, animation: `fadeIn 0.3s ease ${dayIdx * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: day.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#2D2926", boxShadow: `0 3px 10px ${day.color}44` }}>{dayIdx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#999", fontWeight: 500 }}>{day.date}</div>
                    {editingDayTitle === day.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input value={dayTitleVal} onChange={e => setDayTitleVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveDayTitle(day.id)} autoFocus
                          style={{ fontSize: 15, fontWeight: 700, border: "none", borderBottom: `2px solid ${day.color}`, padding: "2px 0", outline: "none", background: "transparent", color: "#2D2926", width: "100%" }} />
                        <button onClick={() => saveDayTitle(day.id)} style={{ padding: "2px 8px", background: "#2D2926", color: "white", border: "none", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>✓</button>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingDayTitle(day.id); setDayTitleVal(day.title); }} style={{ fontSize: 15, fontWeight: 700, color: "#2D2926", cursor: "pointer" }}>
                        {day.title} <span style={{ fontSize: 10, color: "#ddd" }}>✏️</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb" }}>{(day.items||[]).filter(i => i.done).length}/{(day.items||[]).length}</div>
                </div>

                <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                  {(day.items||[]).map((item, idx) => {
                    const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;
                    const nc = (item.notes || []).length;
                    return (
                      <div key={item.id} style={{ borderBottom: idx < day.items.length - 1 ? "1px solid #F5F2ED" : "none", display: "flex", alignItems: "center", opacity: item.done ? 0.4 : 1, transition: "opacity 0.3s" }}>
                        <button onClick={() => toggleDone(day.id, item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? day.color : "#ddd"}`, background: item.done ? day.color : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 0 0 14px", padding: 0 }}>
                          {item.done && <span style={{ color: "white", fontSize: 11 }}>✓</span>}
                        </button>
                        <div onClick={() => { setModalDayId(day.id); setModalItem(item); setModalDayColor(day.color); }} style={{ flex: 1, padding: "12px 10px", cursor: "pointer", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 10, color: "#999", fontWeight: 500 }}>{item.startTime}–{item.endTime}</span>
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: cfg.bg }}>{cfg.emoji}</span>
                            {nc > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F0F0F0", color: "#888" }}>💬{nc}</span>}
                            {item.mapUrl && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E3F2FD", color: "#4A90D9" }}>📍</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#2D2926", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</div>
                        </div>
                        <div style={{ display: "flex", flexShrink: 0, opacity: 0.35, paddingRight: 10 }}>
                          <button onClick={() => moveItem(day.id, item.id, -1)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 9, padding: 0, color: "#666" }}>▲</button>
                          <button onClick={() => moveItem(day.id, item.id, 1)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 9, padding: 0, color: "#666" }}>▼</button>
                          <button onClick={() => deleteItem(day.id, item.id)} style={{ width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontSize: 11, padding: 0 }}>🗑</button>
                        </div>
                      </div>
                    );
                  })}

                  {addingTo === day.id ? (
                    <div style={{ padding: 14, borderTop: "1px dashed #EDE8E0", animation: "fadeIn 0.2s ease" }}>
                      <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-end" }}>
                        <TimePicker label="開始" value={newStartTime} onChange={setNewStartTime} />
                        <TimePicker label="結束" value={newEndTime} onChange={setNewEndTime} />
                      </div>
                      <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem(day.id)} placeholder="行程內容..." style={{ width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", marginBottom: 10 }} autoFocus />
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                        {Object.entries(TYPE_CFG).map(([k, v]) => (
                          <button key={k} onClick={() => setNewType(k)} style={{ padding: "3px 10px", borderRadius: 10, border: newType === k ? "2px solid #2D2926" : "1px solid #ddd", background: newType === k ? v.bg : "white", fontSize: 10, cursor: "pointer" }}>{v.emoji} {v.label}</button>
                        ))}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                          <button onClick={() => addItem(day.id)} style={{ padding: "5px 14px", background: "#2D2926", color: "white", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>新增</button>
                          <button onClick={() => { setAddingTo(null); setNewText(""); }} style={{ padding: "5px 12px", background: "#eee", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>取消</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(day.id)} style={{ width: "100%", padding: "11px", border: "none", borderTop: "1px dashed #EDE8E0", background: "transparent", color: "#ccc", fontSize: 12, cursor: "pointer" }}>＋ 新增項目</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalItem && <ItemModal item={modalItem} dayColor={modalDayColor} travelers={travelers} onClose={() => setModalItem(null)} onUpdate={updateModalItem} />}
    </div>
  );
}
