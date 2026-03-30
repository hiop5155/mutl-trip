import React, { useState } from 'react';
import { CURRENCIES, TC } from '../lib/consts.js';

export default function ExpenseTracker({ expenses, setExpenses, categories, setCategories, exchangeRate, travelers, localCur = "KRW" }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(localCur);
  const [cat, setCat] = useState(categories[0] || "其他");
  const [payer, setPayer] = useState(travelers[0] || "Traveler");
  const [split, setSplit] = useState("equal");
  const [newCat, setNewCat] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);

  const addExpense = () => {
    if (!desc.trim()) {
      alert("請填寫品項說明！");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      alert("金額必須是有效的正數字哦！");
      return;
    }
    setExpenses(prev => [...prev, { id: Date.now(), desc, amount: amt, currency, category: cat, payer, split, time: new Date().toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) }]);
    setDesc(""); setAmount("");
  };

  const addCategory = () => {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories(prev => [...prev, newCat.trim()]);
    setCat(newCat.trim());
    setNewCat(""); setShowAddCat(false);
  };

  // Convert given amount/currency to Local Currency for display total
  // Since we only know Local to TWD, if currency is TWD, convert to Local
  const toLocal = (amt, cur) => {
    if (cur === localCur) return amt;
    if (cur === "TWD" && exchangeRate) return amt / exchangeRate; 
    return amt; // Fallback if no rate
  };
  
  // Convert Local to TWD
  const toTWD = (localAmt) => {
    if (!exchangeRate) return 0;
    return Math.round(localAmt * exchangeRate);
  };

  const totalLocal = expenses.reduce((s, e) => s + toLocal(e.amount, e.currency || localCur), 0);
  const totalLocalSymbol = CURRENCIES[localCur]?.symbol || localCur;

  const paidBy = {}; const owes = {};
  travelers.forEach(t => { paidBy[t] = 0; owes[t] = 0; });
  expenses.forEach(e => {
    const lAmt = toLocal(e.amount, e.currency || localCur);
    paidBy[e.payer] = (paidBy[e.payer] || 0) + lAmt;
    if (e.split === "equal") {
      const share = lAmt / travelers.length;
      travelers.forEach(t => { owes[t] += share; });
    } else {
      owes[e.payer] += lAmt;
    }
  });
  const net = {}; travelers.forEach(t => { net[t] = paidBy[t] - owes[t]; });

  let settlement = null;
  if (travelers.length === 2) {
    const [a, b] = travelers;
    const diff = net[a];
    if (Math.abs(diff) > 0.5) {
      settlement = diff > 0 ? { from: b, to: a, amount: Math.round(diff) } : { from: a, to: b, amount: Math.round(-diff) };
    }
  }

  const byCat = {};
  expenses.forEach(e => { const k = toLocal(e.amount, e.currency || localCur); byCat[e.category] = (byCat[e.category] || 0) + k; });

  const activeCurrencies = {};
  activeCurrencies[localCur] = CURRENCIES[localCur] || { symbol: localCur, label: localCur };
  activeCurrencies["TWD"] = CURRENCIES["TWD"];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Add expense form */}
      <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2926", marginBottom: 12 }}>➕ 新增支出</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="品項說明" style={{ width: "100%", padding: "9px 12px", border: "1px solid #EDE8E0", borderRadius: 10, fontSize: 13, outline: "none", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1px solid #EDE8E0", borderRadius: 10, overflow: "hidden" }}>
          {Object.entries(activeCurrencies).map(([k, v]) => (
            <button key={k} onClick={() => setCurrency(k)} style={{ padding: "10px 14px", border: "none", borderRight: "1px solid #EDE8E0", background: currency === k ? "#2D2926" : "white", color: currency === k ? "white" : "#999", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>{v.symbol}</button>
          ))}
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && addExpense()} placeholder="金額" inputMode="decimal"
            style={{ flex: 1, padding: "10px 12px", border: "none", fontSize: 15, fontWeight: 600, outline: "none", minWidth: 0 }} />
        </div>
        <div style={{ fontSize: 10, color: "#bbb", marginBottom: 10, textAlign: "right" }}>
          {exchangeRate ? `即時匯率：1 ${localCur} ≈ ${exchangeRate.toFixed(4)} TWD` : "匯率載入中..."}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>分類</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{ padding: "4px 12px", borderRadius: 16, border: cat === c ? "2px solid #2D2926" : "1px solid #ddd", background: cat === c ? "#2D2926" : "white", color: cat === c ? "white" : "#666", fontSize: 11, cursor: "pointer", fontWeight: cat === c ? 600 : 400 }}>{c}</button>
            ))}
            {showAddCat ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder="新分類" autoFocus style={{ width: 70, padding: "4px 8px", border: "1px solid #ddd", borderRadius: 8, fontSize: 11, outline: "none" }} />
                <button onClick={addCategory} style={{ padding: "4px 8px", background: "#2D2926", color: "white", border: "none", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>✓</button>
                <button onClick={() => setShowAddCat(false)} style={{ padding: "4px 8px", background: "#eee", border: "none", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAddCat(true)} style={{ padding: "4px 12px", borderRadius: 16, border: "1px dashed #ccc", background: "transparent", color: "#bbb", fontSize: 11, cursor: "pointer" }}>＋</button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>誰付錢</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {travelers.map(t => (
                <button key={t} onClick={() => setPayer(t)} style={{ padding: "5px 14px", borderRadius: 20, border: payer === t ? "none" : "1px solid #ddd", background: payer === t ? (TC[t] || "#2D2926") : "transparent", color: payer === t ? "white" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>分帳方式</div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setSplit("equal")} style={{ padding: "5px 12px", borderRadius: 20, border: split === "equal" ? "2px solid #2D2926" : "1px solid #ddd", background: split === "equal" ? "#2D2926" : "transparent", color: split === "equal" ? "white" : "#888", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>平分</button>
              <button onClick={() => setSplit("solo")} style={{ padding: "5px 12px", borderRadius: 20, border: split === "solo" ? "2px solid #2D2926" : "1px solid #ddd", background: split === "solo" ? "#2D2926" : "transparent", color: split === "solo" ? "white" : "#888", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>自己出</button>
            </div>
          </div>
        </div>
        <button onClick={addExpense} style={{ width: "100%", padding: "10px", background: "#2D2926", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>新增支出</button>
      </div>

      {/* Summary */}
      {expenses.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2926", marginBottom: 14 }}>📊 結算總覽</div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#999" }}>總支出（換算 {CURRENCIES[localCur]?.label||localCur}）</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#2D2926" }}>{totalLocalSymbol} {Math.round(totalLocal).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>≈ NT$ {toTWD(totalLocal).toLocaleString()}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto" }}>
            {travelers.map(t => (
              <div key={t} style={{ flex: 1, minWidth: 80, background: `${TC[t]||"#eee"}15`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TC[t]||"#666", marginBottom: 6 }}>{t}</div>
                <div style={{ fontSize: 10, color: "#999", marginBottom: 2 }}>已付</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2926" }}>{totalLocalSymbol} {Math.round(paidBy[t] || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 6, marginBottom: 2 }}>應付</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>{totalLocalSymbol} {Math.round(owes[t] || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {settlement && (
            <div style={{ background: "linear-gradient(135deg,#FFF9F0,#FFF3E0)", borderRadius: 12, padding: 14, textAlign: "center", marginBottom: 14, border: "1px solid #F5E6D0" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>💰 結算 (2人模式)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#2D2926" }}>
                <span style={{ color: TC[settlement.from] }}>{settlement.from}</span>{" → "}<span style={{ color: TC[settlement.to] }}>{settlement.to}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#E8A87C", marginTop: 4 }}>{totalLocalSymbol} {settlement.amount.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>≈ NT$ {toTWD(settlement.amount).toLocaleString()}</div>
            </div>
          )}
          {!settlement && travelers.length === 2 && <div style={{ textAlign: "center", padding: 10, fontSize: 12, color: "#999", background: "#F9F9F7", borderRadius: 12 }}>✅ 目前帳目平衡</div>}
          {Object.keys(byCat).length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2D2926", marginBottom: 8 }}>分類統計</div>
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F2ED" }}>
                  <span style={{ fontSize: 12, color: "#666" }}>{c}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 4, borderRadius: 2, background: "#EDE8E0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(v / totalLocal) * 100}%`, background: "#C4A882", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#2D2926", minWidth: 80, textAlign: "right" }}>{totalLocalSymbol} {Math.round(v).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2926", marginBottom: 10 }}>📋 支出明細</div>
          {expenses.slice().reverse().map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #F5F2ED" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TC[e.payer] || "#999", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#2D2926" }}>{e.desc}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#F5F2ED", color: "#999" }}>{e.category}</span>
                </div>
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{e.payer} 付 · {e.split === "equal" ? "平分" : "自己出"} · {e.time}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2926", flexShrink: 0 }}>{CURRENCIES[e.currency || localCur]?.symbol || e.currency} {e.amount.toLocaleString()}</div>
              <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} style={{ border: "none", background: "transparent", color: "#ccc", fontSize: 14, cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
