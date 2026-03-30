import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase.js';
import { ref, onValue, update, remove } from 'firebase/database';
import { CURRENCIES, DEFAULT_EXP_CATS } from '../lib/consts.js';

export default function Dashboard({ onSelectTrip }) {
  const [trips, setTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  
  // New trip form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [travelers, setTravelers] = useState("Da, Yun");

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
      alert("回程日期不能早於出發日期！");
      return;
    }
    
    const tripId = "trip_" + Date.now();
    const travelersArr = travelers.split(",").map(t => t.trim()).filter(Boolean);
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
    
    const wds = ["日", "一", "二", "三", "四", "五", "六"];
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
      alert("建立失敗：" + e.message);
    });
  };

  const handleDelete = (e, tripId) => {
    e.stopPropagation();
    if (window.confirm("確定要刪除這個行程計畫嗎？所有資料將會消失且無法恢復哦！")) {
      const updates = {};
      updates[`trips/${tripId}`] = null;
      updates[`tripData/${tripId}`] = null;
      update(ref(db), updates).catch(err => {
        alert("刪除失敗：" + err.message);
      });
    }
  };

  const tripList = Object.values(trips).sort((a,b) => b.id.localeCompare(a.id));

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#2D2926", marginBottom: 30 }}>🌍 我的旅行計畫</h1>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>載入中...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tripList.map(t => (
              <div key={t.id} onClick={() => onSelectTrip(t)} 
                   style={{ background: "white", borderRadius: 16, padding: 20, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.03)", transition: "transform 0.2s", position: "relative" }}>
                <button onClick={(e) => handleDelete(e, t.id)} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, padding: 5 }}>🗑</button>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>{t.dateStart} — {t.dateEnd}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#2D2926", marginBottom: 8, paddingRight: 30 }}>{t.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "#F5F2ED", borderRadius: 6, color: "#666" }}>{t.travelers.length} 人同行</span>
                  <span style={{ fontSize: 11, padding: "3px 8px", background: "#E8F5E9", borderRadius: 6, color: "#2E7D32" }}>{CURRENCIES[t.currency]?.label || t.currency}</span>
                </div>
              </div>
            ))}
            {tripList.length === 0 && !showNew && (
              <div style={{ textAlign: "center", padding: 40, color: "#bbb", fontSize: 14 }}>目前還沒有任何行程，趕快建立一個吧！</div>
            )}
          </div>
        )}

        <div style={{ marginTop: 30 }}>
          {showNew ? (
            <div style={{ background: "white", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", animation: "slideUp 0.3s ease" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>✨ 新增行程</div>
              
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>行程名稱</div>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="例：2027 京都賞楓" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", outline: "none" }} />
              </div>
              
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>出發日</div>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>回程日</div>
                  <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", outline: "none" }} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>基準貨幣 (供記帳使用)</div>
                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", outline: "none", background: "white" }}>
                  {Object.entries(CURRENCIES).map(([k, v]) => <option key={k} value={k}>{k} - {v.label}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>同行旅伴 (用逗號隔開)</div>
                <input value={travelers} onChange={e => setTravelers(e.target.value)} placeholder="Da, Yun, John" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", outline: "none" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCreate} style={{ flex: 1, padding: 12, background: "#2D2926", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>建立行程</button>
                <button onClick={() => setShowNew(false)} style={{ padding: "12px 20px", background: "#eee", color: "#666", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)} style={{ width: "100%", padding: 16, border: "2px dashed #ccc", borderRadius: 16, background: "transparent", color: "#999", fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              ＋ 新增行程計畫
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
