import React from 'react';

export function TimePicker({ value, onChange, label }) {
  const parts = (value && value !== "—") ? value.split(":").map(Number) : [9, 0];
  const h = isNaN(parts[0]) ? 9 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  const fmt = (v) => String(v).padStart(2, "0");
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: "#999", marginBottom: 4, fontWeight: 500 }}>{label}</div>}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <select value={h} onChange={e => onChange(`${fmt(e.target.value)}:${fmt(m)}`)}
          style={{ padding: "7px 18px 7px 8px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontWeight: 600, outline: "none", background: "white", color: "#2D2926", width: 58 }}>
          {Array.from({ length: 24 }, (_, i) => i).map(i => <option key={i} value={i}>{fmt(i)}</option>)}
        </select>
        <span style={{ fontWeight: 700, color: "#999" }}>:</span>
        <select value={m} onChange={e => onChange(`${fmt(h)}:${fmt(e.target.value)}`)}
          style={{ padding: "7px 18px 7px 8px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, fontWeight: 600, outline: "none", background: "white", color: "#2D2926", width: 58 }}>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(i => <option key={i} value={i}>{fmt(i)}</option>)}
        </select>
      </div>
    </div>
  );
}

export function FlightCard({ flight, direction }) {
  if (!flight?.code) return null;
  return (
    <div style={{ background: "linear-gradient(135deg,#4A90D9,#357ABD)", borderRadius: 14, padding: 18, color: "white", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>{direction === "out" ? "去程" : "回程"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{flight.code}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div><div style={{ fontSize: 26, fontWeight: 800 }}>{flight.from}</div><div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{flight.fromName}</div></div>
        <div style={{ fontSize: 20, opacity: 0.5, padding: "0 8px", alignSelf: "center" }}>✈</div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 26, fontWeight: 800 }}>{flight.to}</div><div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{flight.toName}</div></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 10, marginTop: 6 }}>
        <div><div style={{ fontSize: 9, opacity: 0.6 }}>出發</div><div style={{ fontSize: 13, fontWeight: 600 }}>{flight.depart}</div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, opacity: 0.6 }}>抵達</div><div style={{ fontSize: 13, fontWeight: 600 }}>{flight.arrive}</div></div>
      </div>
    </div>
  );
}

export function AccommodationCard({ accom }) {
  const a = accom;
  if (!a?.name) return null;
  return (
    <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#FF5A5F", fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>AIRBNB / HOTEL</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2D2926" }}>{a.name}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{a.title}</div>
        </div>
        {(a.rating || a.reviews) && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>⭐ {a.rating}</div>
            <div style={{ fontSize: 10, color: "#999" }}>{a.reviews} 則評價</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>{a.details}</div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>📍 {a.location}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {(a.features || []).map(f => <span key={f} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "#F5F2ED", color: "#666" }}>{f}</span>)}
      </div>
      {a.url && <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#FF5A5F", fontWeight: 600, textDecoration: "none" }}>查看房源 →</a>}
    </div>
  );
}
