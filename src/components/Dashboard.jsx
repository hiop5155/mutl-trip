import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { db } from '../lib/firebase.js';
import { ref, onValue, update, remove } from 'firebase/database';
import { CURRENCIES, DEFAULT_EXP_CATS } from '../lib/consts.js';

function TravelersInput({ value, onChange }) {
  const { t } = useI18n();
  const [tempVal, setTempVal] = useState("");

  const handleAdd = (e) => {
    e?.preventDefault();
    if (tempVal.trim() && !value.includes(tempVal.trim())) {
      onChange([...value, tempVal.trim()]);
      setTempVal("");
    }
  };

  const handleRemove = (name, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onChange(value.filter(n => n !== name));
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {value.map(v => (
            <div key={v} style={{ padding: "4px 10px", background: "var(--bg-accent)", borderRadius: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              {v}
              <button 
                onClick={(e) => handleRemove(v, e)} 
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: 0, fontSize: 14, display: "flex", alignItems: "center" }}
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input 
          value={tempVal} 
          onChange={e => setTempVal(e.target.value)} 
          onKeyDown={e => { 
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleAdd(e);
            } 
          }}
          placeholder={t("dash.placeholder_travelers")}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-main)", fontSize: 13, outline: "none" }} 
        />
        <button onClick={handleAdd} style={{ padding: "8px 14px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>＋ {t("dash.add_btn")}</button>
      </div>
    </div>
  );
}

export default function Dashboard({ onSelectTrip }) {
  const { t } = useI18n();
  const [trips, setTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editingTripNameVal, setEditingTripNameVal] = useState("");
  const [editingTravelersVal, setEditingTravelersVal] = useState([]);
  const [editingCurrencyVal, setEditingCurrencyVal] = useState("KRW");
  
  // New trip form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [travelers, setTravelers] = useState(["Da", "Yun"]);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, "trips"), (snap) => {
      setTrips(snap.val() || {});
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = () => {
    if (!name.trim() || !startDate || !endDate) {
      alert("請填寫完整資訊");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      alert(t("dash.err_date"));
      return;
    }
    
    const tripId = "trip_" + Date.now();
    const travelersArr = travelers.filter(Boolean);
    const meta = {
      id: tripId,
      name: name.trim(),
      dateStart: startDate,
      dateEnd: endDate,
      currency,
      travelers: travelersArr.length > 0 ? travelersArr : ["Traveler"]
    };

    // Generate Initial Days

    const days = [];
    let dId = 1;
    const colors = ["#E8A87C", "#D4A5A5", "#95B8D1", "#B5CDA3", "#C3B1E1", "#F2D0A4"];
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    
    const wds = [t("day_sun"), t("day_mon"), t("day_tue"), t("day_wed"), t("day_thu"), t("day_fri"), t("day_sat")];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        id: `day${dId}`,
        date: `${d.getMonth() + 1}/${d.getDate()} (${wds[d.getDay()]})`,
        title: `Day ${dId}`,
        color: colors[(dId - 1) % colors.length],
        items: []
      });
      dId++;
    }

    const updates = {};
    updates[`trips/${tripId}`] = meta;
    updates[`tripData/${tripId}`] = {
      days,
      notes: "",
      expenses: [],
      expCats: DEFAULT_EXP_CATS,
      flights: { outbound: {}, inbound: {} },
      accommodation: {}
    };

    update(ref(db), updates).then(() => {
      setShowNew(false);
      setName(""); setStartDate(""); setEndDate(""); setCurrency("KRW"); setTravelers("Da, Yun");
    }).catch(e => {
      console.error("建立行程失敗", e);
      alert(t("dash.err_create_short") + "：" + e.message);
    });
  };

  const handleDelete = (e, tripId) => {
    e.stopPropagation();
    if (window.confirm(t("dash.confirm_delete"))) {
      const updates = {};
      updates[`trips/${tripId}`] = null;
      updates[`tripData/${tripId}`] = null;
      update(ref(db), updates).catch(err => {
        alert(t("dash.err_delete") + "：" + err.message);
      });
    }
  };

  const handleEditStart = (e, t) => {
    e.stopPropagation();
    setEditingTripId(t.id);
    setEditingTripNameVal(t.name);
    setEditingTravelersVal(t.travelers || []);
    setEditingCurrencyVal(t.currency || "KRW");
  };

  const handleEditSave = (e, tripId) => {
    e.stopPropagation();
    const travelersArr = editingTravelersVal.filter(Boolean);
    if (!editingTripNameVal.trim()) {
      alert(t("dash.err_name"));
      return;
    }
    const updates = {
      [`trips/${tripId}/name`]: editingTripNameVal.trim(),
      [`trips/${tripId}/currency`]: editingCurrencyVal,
      [`trips/${tripId}/travelers`]: travelersArr.length > 0 ? travelersArr : ["Traveler"]
    };
    update(ref(db), updates).catch(err => {
      alert(t("dash.err_update") + "：" + err.message);
    });
    setEditingTripId(null);
  };

  const tripList = Object.values(trips).sort((a,b) => b.id.localeCompare(a.id));

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
                   style={{ background: "var(--bg-card)", borderRadius: 16, padding: 20, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", transition: "transform 0.2s", position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                  <button onClick={(e) => handleEditStart(e, trip)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 5 }}>✏️</button>
                  <button onClick={(e) => handleDelete(e, trip.id)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, padding: 5 }}>🗑</button>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{trip.dateStart} — {trip.dateEnd}</div>
                {editingTripId === trip.id ? (
                  <div style={{ marginBottom: 8, paddingRight: 60 }} onClick={e => e.stopPropagation()}>
                    <input 
                      autoFocus 
                      value={editingTripNameVal} 
                      onChange={e => setEditingTripNameVal(e.target.value)} 
                      onKeyDown={e => { if(e.key === "Enter") handleEditSave(e, trip.id); }}
                      placeholder={t("dash.trip_name")}
                      style={{ fontSize: 20, fontWeight: 700, border: "none", borderBottom: "2px solid #2D2926", outline: "none", width: "100%", padding: "2px 0", color: "var(--text-main)", background: "transparent", marginBottom: 12 }} 
                    />
                    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.currency")}</div>
                        <select 
                          value={editingCurrencyVal} 
                          onChange={e => setEditingCurrencyVal(e.target.value)} 
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-main)", fontSize: 12, outline: "none", background: "var(--bg-card)" }}>
                          {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} - {t(`cur.${k}`)}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 2 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.travelers")}</div>
                        <TravelersInput value={editingTravelersVal} onChange={setEditingTravelersVal} />
                      </div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <button onClick={(e) => handleEditSave(e, trip.id)} style={{ padding: "4px 12px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{t("dash.save")}</button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTripId(null); }} style={{ padding: "4px 12px", background: "var(--btn-hover)", color: "var(--text-muted)", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{t("dash.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", marginBottom: 8, paddingRight: 60 }}>{trip.name}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", background: "var(--bg-accent)", borderRadius: 6, color: "var(--text-muted)" }}>{trip.travelers?.length}  {t("dash.travelers_count")}</span>
                      <span style={{ fontSize: 11, padding: "3px 8px", background: "#E8F5E9", borderRadius: 6, color: "#2E7D32" }}>{t(`cur.${trip.currency}`) || trip.currency}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
            {tripList.length === 0 && !showNew && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>{t("dash.empty")}</div>
            )}
          </div>
        )}

        <div style={{ marginTop: 30 }}>
          {showNew ? (
            <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", animation: "slideUp 0.3s ease" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{t("dash.new_trip")}</div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.trip_name")}</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t("dash.placeholder_name")} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none" }} />
              </div>
              
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.startDate")}</div>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.endDate")}</div>
                  <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none" }} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.currency_desc")}</div>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-main)", outline: "none", background: "var(--bg-card)" }}>
                  {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} - {t(`cur.${k}`)}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("dash.travelers")}</div>
                <TravelersInput value={travelers} onChange={setTravelers} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCreate} style={{ flex: 1, padding: 12, background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>{t("dash.create_btn")}</button>
                <button onClick={() => setShowNew(false)} style={{ padding: "12px 20px", background: "var(--btn-hover)", color: "var(--text-muted)", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>{t("dash.cancel")}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)} style={{ width: "100%", padding: 16, border: "2px dashed var(--border-main)", borderRadius: 16, background: "transparent", color: "var(--text-muted)", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              ＋ {t("dash.add_btn")}行程計畫
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
