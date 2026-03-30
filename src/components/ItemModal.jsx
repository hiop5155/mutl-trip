import React, { useState } from 'react';
import { TC, TYPE_CFG } from '../lib/consts.js';
import { TimePicker } from './Cards.jsx';

export default function ItemModal({ item, dayColor, travelers, onClose, onUpdate }) {
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState(travelers[0] || "Traveler");
  const [editingText, setEditingText] = useState(false);
  const [textVal, setTextVal] = useState(item.text);
  const [editingMap, setEditingMap] = useState(false);
  const [mapVal, setMapVal] = useState(item.mapUrl || "");
  const cfg = TYPE_CFG[item.type] || TYPE_CFG.activity;

  const addNote = () => {
    if (!noteText.trim()) return;
    const n = [...(item.notes || []), { id: Date.now(), author: noteAuthor, text: noteText, time: new Date().toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) }];
    onUpdate({ ...item, notes: n });
    setNoteText("");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FAF7F2", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
        <div style={{ background: dayColor, padding: "16px 20px 14px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 8, background: "rgba(255,255,255,0.3)", color: "#2D2926", fontWeight: 600 }}>{cfg.emoji} {cfg.label}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.1)", color: "#2D2926", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {editingText ? (
            <div style={{ marginBottom: 16 }}>
              <input value={textVal} onChange={e => setTextVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onUpdate({ ...item, text: textVal }); setEditingText(false); } }} autoFocus
                style={{ width: "100%", fontSize: 18, fontWeight: 700, border: "none", borderBottom: `2px solid ${dayColor}`, padding: "4px 0", outline: "none", background: "transparent", color: "#2D2926" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={() => { onUpdate({ ...item, text: textVal }); setEditingText(false); }} style={{ padding: "4px 14px", background: "#2D2926", color: "white", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>儲存</button>
                <button onClick={() => setEditingText(false)} style={{ padding: "4px 14px", background: "#eee", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>取消</button>
              </div>
            </div>
          ) : (
            <h2 onClick={() => { setTextVal(item.text); setEditingText(true); }} style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#2D2926", cursor: "pointer", lineHeight: 1.4 }}>
              {item.text} <span style={{ fontSize: 11, color: "#ccc" }}>✏️</span>
            </h2>
          )}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, background: "white", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <TimePicker label="開始時間" value={item.startTime} onChange={v => onUpdate({ ...item, startTime: v })} />
            <div style={{ width: 1, background: "#EDE8E0" }} />
            <TimePicker label="結束時間" value={item.endTime} onChange={v => onUpdate({ ...item, endTime: v })} />
          </div>
          {/* Map link */}
          <div style={{ marginBottom: 16, background: "white", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2926", marginBottom: 8 }}>📍 地圖連結</div>
            {editingMap ? (
              <div>
                <textarea value={mapVal} onChange={e => setMapVal(e.target.value)} placeholder={"直接貼上分享內容即可，會自動擷取連結\n\n例：[NAVER Maps] 店名\n地址\nhttps://naver.me/xxxxx"} autoFocus rows={4}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDE8E0", borderRadius: 10, fontSize: 12, outline: "none", marginBottom: 8, color: "#2D2926", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => {
                    const raw = mapVal.trim();
                    const urlMatch = raw.match(/https?:\/\/[^\s\n]+/);
                    const url = urlMatch ? urlMatch[0] : raw;
                    onUpdate({ ...item, mapUrl: url }); setEditingMap(false);
                  }}
                    style={{ padding: "5px 14px", background: "#2D2926", color: "white", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>儲存</button>
                  <button onClick={() => { setMapVal(item.mapUrl || ""); setEditingMap(false); }}
                    style={{ padding: "5px 14px", background: "#eee", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>取消</button>
                  {item.mapUrl && <button onClick={() => { onUpdate({ ...item, mapUrl: "" }); setMapVal(""); setEditingMap(false); }}
                    style={{ padding: "5px 14px", background: "transparent", color: "#E57373", border: "1px solid #E57373", borderRadius: 8, fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>移除</button>}
                </div>
              </div>
            ) : item.mapUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <a href={item.mapUrl} target="_blank" rel="noreferrer"
                  style={{ flex: 1, fontSize: 12, color: "#4A90D9", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {item.mapUrl.includes("naver") ? "🟢 Naver Map" : item.mapUrl.includes("google") ? "🔵 Google Maps" : "🔗 地圖連結"} — 點擊開啟
                </a>
                <button onClick={() => { setMapVal(item.mapUrl); setEditingMap(true); }}
                  style={{ border: "none", background: "transparent", fontSize: 12, cursor: "pointer", padding: 0, flexShrink: 0, color: "#999" }}>✏️</button>
              </div>
            ) : (
              <button onClick={() => setEditingMap(true)}
                style={{ width: "100%", padding: "10px", border: "1px dashed #ddd", borderRadius: 10, background: "transparent", color: "#bbb", fontSize: 12, cursor: "pointer" }}>
                ＋ 新增 Google Maps / Naver Map 連結
              </button>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2926", marginBottom: 10 }}>💬 筆記</div>
            {(item.notes || []).length === 0 && <div style={{ fontSize: 12, color: "#bbb", padding: "12px 0", textAlign: "center" }}>還沒有筆記</div>}
            {(item.notes || []).map(n => (
              <div key={n.id} style={{ background: "white", borderRadius: 10, padding: "10px 14px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${TC[n.author] || "#ccc"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TC[n.author]||"#999", background: `${TC[n.author]||"#999"}22`, padding: "2px 8px", borderRadius: 6 }}>{n.author}</span>
                    <span style={{ fontSize: 10, color: "#bbb" }}>{n.time}</span>
                  </div>
                  <button onClick={() => onUpdate({ ...item, notes: (item.notes || []).filter(x => x.id !== n.id) })} style={{ border: "none", background: "transparent", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>✕</button>
                </div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{n.text}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "white", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {travelers.map(t => (
                <button key={t} onClick={() => setNoteAuthor(t)} style={{ padding: "5px 14px", borderRadius: 20, border: noteAuthor === t ? "none" : "1px solid #ddd", background: noteAuthor === t ? (TC[t]||"#666") : "transparent", color: noteAuthor === t ? "white" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="新增筆記..." style={{ flex: 1, padding: "10px 12px", border: "1px solid #EDE8E0", borderRadius: 10, fontSize: 13, outline: "none" }} />
              <button onClick={addNote} style={{ padding: "8px 16px", background: "#2D2926", color: "white", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>送出</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
