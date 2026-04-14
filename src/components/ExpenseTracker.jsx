import React, { useState } from 'react';
import { useI18n } from '../lib/I18nContext.jsx';
import { CURRENCIES, TC, getCatColor } from '../lib/consts.js';

function DonutChart({ data, total, symbol }) {
  const circumference = 2 * Math.PI * 42;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        <circle cx={50} cy={50} r={42} fill="none" stroke="var(--bg-accent)" strokeWidth={16} />
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dash = pct * circumference;
          const off = -offset * circumference;
          offset += pct;
          return (
            <circle key={i} cx={50} cy={50} r={42} fill="none"
              stroke={d.color} strokeWidth={16}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={off}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
          );
        })}
        <text x={50} y={54} textAnchor="middle" fontSize={10} fill="var(--text-main)" fontWeight={700}>{symbol}</text>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-main)", flexShrink: 0 }}>{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpenseTracker(props) {
  const { t } = useI18n();
  const { expenses, setExpenses, categories, setCategories, exchangeRate, travelers, localCur = "KRW", currentUser, selfTraveler, uidToName = {} } = props;
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(localCur);
  const [cat, setCat] = useState(categories[0] || "其他");
  // Payer is always the current user
  const payer = selfTraveler || travelers[0] || "Traveler";
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
    setExpenses(prev => [...prev, { id: Date.now(), desc, amount: amt, currency, category: cat, payer, split, time: new Date().toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }), creatorUid: currentUser?.uid || null }]);
    setDesc(""); setAmount("");
  };

  const addCategory = () => {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories(prev => [...prev, newCat.trim()]);
    setCat(newCat.trim());
    setNewCat(""); setShowAddCat(false);
  };

  const deleteCategory = (catToDelete) => {
    if (categories.length <= 1) {
      alert("至少要保留一個類別哦！");
      return;
    }
    if (window.confirm(`確定要刪除「${catToDelete}」類別嗎？`)) {
      setCategories(prev => prev.filter(c => c !== catToDelete));
      if (cat === catToDelete) {
        setCat(categories.filter(c => c !== catToDelete)[0]);
      }
    }
  };

  // Convert given amount/currency to Local Currency for display total
  // Since we only know Local to TWD, if currency is TWD, convert to Local
  const toLocal = (amt, cur) => {
    if (cur === localCur) return amt;
    if (cur === "TWD" && exchangeRate) return amt * exchangeRate;
    return amt;
  };

  // Convert Local to TWD
  const toTWD = (localAmt) => {
    if (!exchangeRate) return 0;
    return Math.round(localAmt / exchangeRate);
  };

  // Resolve current display name for an expense's payer (handles name changes)
  const resolvePayer = (e) => (e.creatorUid && uidToName[e.creatorUid]) || e.payer;

  const totalLocal = expenses.reduce((s, e) => s + toLocal(e.amount, e.currency || localCur), 0);
  const totalLocalSymbol = CURRENCIES[localCur]?.symbol || localCur;

  const paidBy = {}; const owes = {};
  travelers.forEach(t => { paidBy[t] = 0; owes[t] = 0; });
  expenses.forEach(e => {
    const resolvedPayer = resolvePayer(e);
    const lAmt = toLocal(e.amount, e.currency || localCur);
    paidBy[resolvedPayer] = (paidBy[resolvedPayer] || 0) + lAmt;
    if (e.split === "equal") {
      const share = lAmt / travelers.length;
      travelers.forEach(t => { owes[t] += share; });
    } else {
      owes[resolvedPayer] = (owes[resolvedPayer] || 0) + lAmt;
    }
  });
  const net = {}; travelers.forEach(t => { net[t] = paidBy[t] - owes[t]; });

  // Greedy minimum-transactions settlement for any number of people
  const computeSettlements = () => {
    const eps = 0.5;
    const credits = travelers.map(t => ({ name: t, val: Math.round(net[t]) })).filter(x => x.val > eps).sort((a, b) => b.val - a.val);
    const debts   = travelers.map(t => ({ name: t, val: Math.round(net[t]) })).filter(x => x.val < -eps).sort((a, b) => a.val - b.val);
    const result = [];
    let ci = 0, di = 0;
    while (ci < credits.length && di < debts.length) {
      const amount = Math.min(credits[ci].val, -debts[di].val);
      if (amount > eps) result.push({ from: debts[di].name, to: credits[ci].name, amount: Math.round(amount) });
      credits[ci].val -= amount;
      debts[di].val  += amount;
      if (credits[ci].val < eps) ci++;
      if (-debts[di].val  < eps) di++;
    }
    return result;
  };
  const settlements = expenses.length > 0 ? computeSettlements() : [];

  const byCat = {};
  expenses.forEach(e => { const k = toLocal(e.amount, e.currency || localCur); byCat[e.category] = (byCat[e.category] || 0) + k; });

  const activeCurrencies = {};
  activeCurrencies[localCur] = CURRENCIES[localCur] || { symbol: localCur, label: localCur };
  activeCurrencies["TWD"] = CURRENCIES["TWD"];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Add expense form */}
      <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 12 }}>{t("exp.add_title")}</div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("exp.desc_placeholder")} style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border-main)", borderRadius: 10, fontSize: 13, outline: "none", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1px solid var(--border-main)", borderRadius: 10, overflow: "hidden" }}>
          {Object.entries(activeCurrencies).map(([k, v]) => (
            <button key={k} onClick={() => setCurrency(k)} style={{ padding: "10px 14px", border: "none", borderRight: "1px solid var(--border-main)", background: currency === k ? "var(--btn-bg)" : "var(--input-bg)", color: currency === k ? "var(--btn-text)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>{v.symbol}</button>
          ))}
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && addExpense()} placeholder={t("exp.amount")} inputMode="decimal"
            style={{ flex: 1, padding: "10px 12px", border: "none", fontSize: 15, fontWeight: 600, outline: "none", minWidth: 0 }} />
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 10, textAlign: "right" }}>
          {exchangeRate ? `${t("exp.rate_label")}：1 ${localCur} ≈ ${exchangeRate.toFixed(4)} TWD` : t("exp.rate_loading")}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{t("exp.category")}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {categories.map(c => (
              <div key={c} style={{ position: "relative", display: "inline-flex" }}>
                <button onClick={() => setCat(c)} style={{ padding: "4px 12px", paddingRight: cat === c ? 24 : 12, borderRadius: 16, border: cat === c ? "2px solid var(--btn-bg)" : "1px solid var(--border-main)", background: cat === c ? "var(--btn-bg)" : "var(--bg-card)", color: cat === c ? "var(--btn-text)" : "var(--text-muted)", fontSize: 11, cursor: "pointer", fontWeight: cat === c ? 600 : 400 }}>{t(c)}</button>
                {cat === c && (
                   <span onClick={(e) => { e.stopPropagation(); deleteCategory(c); }} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 10, cursor: "pointer", opacity: 0.8 }}>✕</span>
                )}
              </div>
            ))}
            {showAddCat ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder={t("exp.new_cat")} autoFocus style={{ width: 70, padding: "4px 8px", border: "1px solid var(--border-main)", borderRadius: 8, fontSize: 11, outline: "none" }} />
                <button onClick={addCategory} style={{ padding: "4px 8px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>✓</button>
                <button onClick={() => setShowAddCat(false)} style={{ padding: "4px 8px", background: "var(--btn-hover)", border: "none", borderRadius: 8, fontSize: 10, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAddCat(true)} style={{ padding: "4px 12px", borderRadius: 16, border: "1px dashed var(--border-main)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>＋</button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{t("exp.payer")}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <span style={{ padding: "5px 14px", borderRadius: 20, background: TC[payer] || "var(--btn-bg)", color: "var(--btn-text)", fontSize: 12, fontWeight: 600 }}>{payer}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{t("exp.split")}</div>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setSplit("equal")} style={{ padding: "5px 12px", borderRadius: 20, border: split === "equal" ? "2px solid var(--btn-bg)" : "1px solid var(--border-main)", background: split === "equal" ? "var(--btn-bg)" : "transparent", color: split === "equal" ? "var(--btn-text)" : "var(--text-muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{t("exp.split_eq")}</button>
              <button onClick={() => setSplit("solo")} style={{ padding: "5px 12px", borderRadius: 20, border: split === "solo" ? "2px solid var(--btn-bg)" : "1px solid var(--border-main)", background: split === "solo" ? "var(--btn-bg)" : "transparent", color: split === "solo" ? "var(--btn-text)" : "var(--text-muted)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{t("exp.split_solo")}</button>
            </div>
          </div>
        </div>
        <button onClick={addExpense} style={{ width: "100%", padding: "10px", background: "var(--btn-bg)", color: "var(--btn-text)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t("exp.add_btn")}</button>
      </div>

      {/* Summary */}
      {expenses.length > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 14 }}>{t("exp.summary")}</div>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("exp.total")} ({CURRENCIES[localCur]?.label || localCur}）</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)" }}>{totalLocalSymbol} {Math.round(totalLocal).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>≈ NT$ {toTWD(totalLocal).toLocaleString()}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto" }}>
            {travelers.map(tr => (
              <div key={tr} style={{ flex: 1, minWidth: 80, background: `${TC[tr] || "#eee"}15`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TC[tr] || "#666", marginBottom: 6 }}>{tr}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{t("exp.paid")}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{totalLocalSymbol} {Math.round(paidBy[tr] || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, marginBottom: 2 }}>{t("exp.owes")}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{totalLocalSymbol} {Math.round(owes[tr] || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {settlements.length > 0 ? (
            <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-main)", marginBottom: 14 }}>
              <div style={{ background: "var(--bg-accent)", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>{t("exp.settle")}</div>
              {settlements.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderTop: "1px solid var(--border-light)", background: "var(--bg-card)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{s.from}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>→</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{s.to}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-main)" }}>{totalLocalSymbol} {s.amount.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>≈ NT$ {toTWD(s.amount).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            expenses.length > 0 && <div style={{ textAlign: "center", padding: 10, fontSize: 12, color: "var(--text-muted)", background: "var(--bg-accent)", borderRadius: 12, marginBottom: 14 }}>{t("exp.balanced")}</div>
          )}
          {Object.keys(byCat).length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", marginBottom: 10 }}>{t("exp.cat_stats")}</div>
              <DonutChart
                total={totalLocal}
                symbol={totalLocalSymbol}
                data={Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v], i) => ({ label: t(c), value: v, color: getCatColor(c, i) }))}
              />
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v], i) => (
                <div key={c} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: getCatColor(c, i), flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t(c)}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>{totalLocalSymbol} {Math.round(v).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 10 }}>📋 支出明細</div>
          {expenses.slice().reverse().map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: TC[resolvePayer(e)] || "#999", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{e.desc}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--bg-accent)", color: "var(--text-muted)" }}>{t(e.category)}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{resolvePayer(e)} 付 · {e.split === "equal" ? "平分" : "自己出"} · {e.time}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", flexShrink: 0 }}>{CURRENCIES[e.currency || localCur]?.symbol || e.currency} {e.amount.toLocaleString()}</div>
              {(!e.creatorUid || e.creatorUid === currentUser?.uid) && (
                <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} style={{ border: "none", background: "transparent", color: "#ccc", fontSize: 14, cursor: "pointer", padding: 0, flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
