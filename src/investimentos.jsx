// ===== Módulo Investimentos =====
// Sub-abas: Visão geral · Tesouro Direto · Ações · FIIs · ETFs · RF · Fundos · Cripto
// Modelo de dados: state.investments.assets = [
//   { id, ticker, name, class, operations: [{id,date,type,qty,price}], currentPrice, lastPriceUpdate, dividends: [{id,date,amount}] }
// ]
// "type" da operação: "buy" (compra) | "sell" (venda)

const ASSET_CLASSES = [
  { id: "acoes",   name: "Ações",                color: "#60A5FA" },
  { id: "fiis",    name: "Fundos Imobiliários",  color: "#4ADE80" },
  { id: "etfs",    name: "ETFs",                 color: "#FBBF24" },
  { id: "rf",      name: "Renda Fixa",           color: "#F472B6" },
  { id: "fundos",  name: "Fundos",               color: "#22D3EE" },
  { id: "cripto",  name: "Cripto",               color: "#FB923C" },
];
const classById = (id) => ASSET_CLASSES.find((c) => c.id === id) || ASSET_CLASSES[0];

// Mapeia classe local -> InstrumentKind do Retirement (github.com/srocupado/Retirement)
const RETIREMENT_KIND_BY_CLASS = {
  acoes:  "acaoDividendos",
  fiis:   "fii",
  etfs:   "equityEtf",
  rf:     "cdb",
  fundos: "fundoDI",
  cripto: "cryptoDirect",
};

function retirementTreasuryTicker(holding) {
  const year = (holding.maturity || "").slice(0, 4);
  if (year) return `TESOURO_IPCA_${year}`;
  return (holding.name || "TESOURO_IPCA").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function buildRetirementTransactions(state) {
  const out = [];
  for (const a of state.investments?.assets || []) {
    const kind = RETIREMENT_KIND_BY_CLASS[a.class] || "cdb";
    const ticker = (a.ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    for (const op of a.operations || []) {
      const quantity = parseFloat(op.qty);
      const price = parseFloat(op.price);
      if (!isFinite(quantity) || quantity <= 0 || !isFinite(price) || price < 0) continue;
      out.push({
        id: op.id || uid(),
        date: op.date,
        ticker,
        kind,
        type: op.type === "sell" ? "sell" : "buy",
        quantity,
        price,
      });
    }
  }
  for (const h of state.treasuryHoldings || []) {
    const ticker = retirementTreasuryTicker(h);
    for (const c of h.contributions || []) {
      const amount = parseFloat(c.amount);
      if (!isFinite(amount) || amount <= 0) continue;
      out.push({
        id: c.id || uid(),
        date: c.date,
        ticker,
        kind: "tesouroIpca",
        type: "buy",
        quantity: 1,
        price: amount,
      });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function exportRetirementJSON(state) {
  const transactions = buildRetirementTransactions(state);
  if (transactions.length === 0) {
    alert("Nenhuma operação ou aporte para exportar.");
    return;
  }
  const blob = new Blob([JSON.stringify({ version: 1, transactions }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retirement-carteira-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Calcula preço médio + posição. Operações tipo "buy" adicionam; "sell" reduz.
// PM se mantém em vendas (FIFO simplificado: PM da posição restante = PM atual).
function computeAssetMetrics(asset) {
  const ops = [...(asset.operations || [])].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  let qty = 0, totalCost = 0;
  ops.forEach((op) => {
    const q = parseFloat(op.qty) || 0;
    const p = parseFloat(op.price) || 0;
    if (op.type === "buy") { qty += q; totalCost += q * p; }
    else if (op.type === "sell") {
      const pm = qty > 0 ? totalCost / qty : 0;
      qty -= q; totalCost -= q * pm;
      if (qty < 0.0000001) { qty = 0; totalCost = 0; }
    }
  });
  const pm = qty > 0 ? totalCost / qty : 0;
  const currentPrice = parseFloat(asset.currentPrice) || pm;
  const position = qty * currentPrice;
  const invested = qty * pm;
  const pnl = position - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const divTotal = (asset.dividends || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  return { qty, pm, currentPrice, position, invested, pnl, pnlPct, divTotal };
}

// ---- Form: Nova operação ----
function OperationForm({ initial, initialClass, assets, onSave, onCancel }) {
  const [mode, setMode] = useState(initial?.assetId ? "existing" : "new");
  const [assetId, setAssetId] = useState(initial?.assetId || (assets[0]?.id || ""));
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [klass, setKlass] = useState(initialClass || "acoes");
  const [opType, setOpType] = useState("buy");
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const submit = () => {
    const q = parseFloat(qty), p = parseFloat(price);
    if (!q || !p || isNaN(q) || isNaN(p)) return alert("Informe quantidade e preço.");
    if (mode === "new") {
      if (!ticker.trim()) return alert("Informe o ticker / código.");
      onSave({ mode: "new", asset: { ticker: ticker.trim().toUpperCase(), name: (name || ticker).trim(), class: klass, currentPrice: p }, op: { date, type: opType, qty: q, price: p } });
    } else {
      if (!assetId) return alert("Selecione um ativo.");
      onSave({ mode: "existing", assetId, op: { date, type: opType, qty: q, price: p } });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="pill-group" style={{ display: "inline-flex", gap: 4, padding: 3, background: "var(--bg-1)", borderRadius: 10, border: "1px solid var(--border)", alignSelf: "flex-start" }}>
        <div className={"pill" + (mode === "existing" ? " active" : "")} onClick={() => setMode("existing")} style={pillStyle(mode === "existing")}>Ativo existente</div>
        <div className={"pill" + (mode === "new" ? " active" : "")} onClick={() => setMode("new")} style={pillStyle(mode === "new")}>Novo ativo</div>
      </div>

      {mode === "existing" ? (
        <div className="field">
          <label>Ativo</label>
          <select className="select" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.length === 0 && <option value="">— nenhum ativo cadastrado —</option>}
            {assets.map((a) => <option key={a.id} value={a.id}>{a.ticker} · {a.name}</option>)}
          </select>
        </div>
      ) : (
        <div className="grid grid-2">
          <div className="field">
            <label>Ticker / Código</label>
            <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="ITUB4, HGLG11, BTC…" />
          </div>
          <div className="field">
            <label>Classe</label>
            <select className="select" value={klass} onChange={(e) => setKlass(e.target.value)}>
              {ASSET_CLASSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Nome (opcional)</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Itaú Unibanco PN" />
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="field">
          <label>Operação</label>
          <select className="select" value={opType} onChange={(e) => setOpType(e.target.value)}>
            <option value="buy">Compra</option>
            <option value="sell">Venda</option>
          </select>
        </div>
        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Quantidade</label>
          <input className="input" type="number" step="0.0000001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </div>
        <div className="field">
          <label>Preço unitário (R$)</label>
          <input className="input" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
        </div>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> Registrar operação</button>
      </div>
    </div>
  );
}
function pillStyle(active) {
  return { padding: "6px 12px", fontSize: 12, fontWeight: 500, color: active ? "var(--text)" : "var(--text-dim)", cursor: "pointer", borderRadius: 7, background: active ? "var(--surface-strong)" : "transparent" };
}

// ---- Form: Atualizar cotação ----
function PriceForm({ asset, onSave, onCancel }) {
  const m = computeAssetMetrics(asset);
  const [price, setPrice] = useState(m.currentPrice ? String(m.currentPrice.toFixed(2)) : "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="muted" style={{ fontSize: 13 }}>Atualizar cotação de <strong style={{ color: "var(--text)" }}>{asset.ticker}</strong> · {asset.name}</div>
      <div className="grid grid-2">
        <div className="field">
          <label>Preço médio atual</label>
          <input className="input" disabled value={fmtBRL(m.pm)} />
        </div>
        <div className="field">
          <label>Nova cotação (R$)</label>
          <input className="input" type="number" step="0.000001" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
        </div>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={() => onSave({ currentPrice: parseFloat(price) || 0, lastPriceUpdate: todayISO() })}><Icon name="check" size={14}/> Atualizar</button>
      </div>
    </div>
  );
}

// ---- Form: Provento ----
function DividendForm({ asset, onSave, onCancel }) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const submit = () => {
    const a = parseFloat(amount);
    if (!a || isNaN(a)) return alert("Informe o valor.");
    onSave({ id: uid(), date, amount: Math.abs(a) });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="muted" style={{ fontSize: 13 }}>Provento recebido de <strong style={{ color: "var(--text)" }}>{asset.ticker}</strong></div>
      <div className="grid grid-2">
        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor (R$)</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus />
        </div>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> Registrar</button>
      </div>
    </div>
  );
}

// ---- Donut + KPIs (Visão geral) ----
function Donut({ data, size = 200, thickness = 28 }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total <= 0) {
    return <div style={{ width: size, height: size, display: "grid", placeItems: "center", color: "var(--text-dim)", fontSize: 12 }}>Sem dados</div>;
  }
  const r = (size - thickness) / 2, cx = size/2, cy = size/2, circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness}/>
      {data.map((d) => {
        const len = (d.total/total) * circ;
        const seg = <circle key={d.id} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness} strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`}/>;
        offset += len; return seg;
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="10" fill="var(--text-dim)" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Patrimônio</text>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)">{fmtBRLCompact(total)}</text>
    </svg>
  );
}

// ---- Painel "Visão geral" ----
function VisaoGeral({ state, setState }) {
  const assets = state.investments?.assets || [];
  // Tesouro Direto (carteira de aposentadoria via títulos públicos)
  const treasuryTotal = (state.treasuryHoldings || []).reduce((s, h) => s + holdingCurrentValue(h), 0);
  const apClass = { id: "tesouro-direto", name: "Tesouro Direto", color: "#A78BFA", total: treasuryTotal };

  const byClass = ASSET_CLASSES.map((c) => {
    const list = assets.filter((a) => a.class === c.id);
    const total = list.reduce((s, a) => s + computeAssetMetrics(a).position, 0);
    return { ...c, total, count: list.length };
  });
  const all = [apClass, ...byClass].filter((c) => c.total > 0 || c.count > 0);
  const grand = all.reduce((s, c) => s + c.total, 0);

  const topAssets = assets.map((a) => ({ ...a, ...computeAssetMetrics(a), classObj: classById(a.class) }))
    .filter((a) => a.qty > 0)
    .sort((x, y) => y.position - x.position).slice(0, 8);
  const totalPnl = assets.reduce((s, a) => s + computeAssetMetrics(a).pnl, 0);
  const totalInvested = assets.reduce((s, a) => s + computeAssetMetrics(a).invested, 0);
  const totalDiv = assets.reduce((s, a) => s + computeAssetMetrics(a).divTotal, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div className="card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Patrimônio total</div><div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }} className="tabular">{fmtBRL(grand)}</div></div>
        <div className="card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>P&L acumulado</div><div className={"tabular " + (totalPnl >= 0 ? "pos" : "neg")} style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: totalPnl >= 0 ? "var(--success)" : "var(--danger)" }}>{(totalPnl >= 0 ? "+" : "") + fmtBRL(totalPnl)}</div><div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{totalInvested > 0 ? ((totalPnl/totalInvested)*100).toFixed(2) + "%" : "—"} s/ investido</div></div>
        <div className="card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Proventos recebidos</div><div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }} className="tabular">{fmtBRL(totalDiv)}</div></div>
        <div className="card" style={{ padding: 14 }}><div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Ativos ativos</div><div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }} className="tabular">{assets.filter((a) => computeAssetMetrics(a).qty > 0).length}</div><div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{all.length} classes</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-title">Distribuição</div>
          {grand > 0 ? (
            <>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}><Donut data={all}/></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {all.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }}/>
                      {c.name}
                    </span>
                    <span style={{ color: "var(--text-dim)" }} className="tabular">{((c.total/grand)*100).toFixed(1)}% · {fmtBRLCompact(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="empty">Sem ativos ainda</div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title" style={{ margin: 0 }}>Top ativos por posição</div><span className="chip">{topAssets.length}</span></div>
          {topAssets.length === 0 ? <div className="empty">Adicione uma operação para começar.</div> : (
            <table className="table">
              <thead><tr><th>Ativo</th><th>Classe</th><th className="num">Qtd</th><th className="num">PM</th><th className="num">Cotação</th><th className="num">Posição</th><th className="num">P&L</th></tr></thead>
              <tbody>
                {topAssets.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.ticker}</strong><div style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.name}</div></td>
                    <td><span className="chip" style={{ background: a.classObj.color + "22", color: a.classObj.color, border: "none" }}>{a.classObj.name}</span></td>
                    <td className="num">{formatQty(a.qty)}</td>
                    <td className="num">{a.pm.toFixed(2)}</td>
                    <td className="num">{a.currentPrice.toFixed(2)}</td>
                    <td className="num"><strong>{fmtBRL(a.position)}</strong></td>
                    <td className={"num " + (a.pnl >= 0 ? "pos" : "neg")}>{(a.pnl >= 0 ? "+" : "") + fmtBRL(a.pnl)}<div style={{ fontSize: 11, opacity: 0.8 }}>{(a.pnl >= 0 ? "+" : "") + a.pnlPct.toFixed(2) + "%"}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function formatQty(q) {
  if (q === 0) return "0";
  if (q < 1) return q.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return Number.isInteger(q) ? String(q) : q.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

// ---- Painel de classe (Ações / FIIs / etc) ----
function ClassPanel({ state, setState, klass, openNew, openPrice, openDividend, openOps, removeAsset }) {
  const assets = (state.investments?.assets || []).filter((a) => a.class === klass.id);
  const enriched = assets.map((a) => ({ ...a, m: computeAssetMetrics(a) }));
  const total = enriched.reduce((s, a) => s + a.m.position, 0);
  const totalInv = enriched.reduce((s, a) => s + a.m.invested, 0);
  const totalPnl = total - totalInv;
  const totalDiv = enriched.reduce((s, a) => s + a.m.divTotal, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card hero" style={{ padding: 18 }}>
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)" }}>{klass.name}</div>
            <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }} className="tabular">{fmtBRL(total)}</div>
            <div className={"tabular " + (totalPnl >= 0 ? "pos" : "neg")} style={{ fontSize: 13, marginTop: 4, color: totalPnl >= 0 ? "var(--success)" : "var(--danger)" }}>
              {(totalPnl >= 0 ? "+" : "") + fmtBRL(totalPnl)} ({totalInv > 0 ? (totalPnl/totalInv*100).toFixed(2) + "%" : "—"})
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>INVESTIDO</div><div className="tabular" style={{ fontSize: 16, fontWeight: 600 }}>{fmtBRL(totalInv)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>PROVENTOS</div><div className="tabular" style={{ fontSize: 16, fontWeight: 600 }}>{fmtBRL(totalDiv)}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>ATIVOS</div><div className="tabular" style={{ fontSize: 16, fontWeight: 600 }}>{enriched.filter((a) => a.m.qty > 0).length}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title" style={{ margin: 0 }}>Ativos</div>
          <button className="btn primary sm" onClick={() => openNew(klass.id)}><Icon name="plus" size={12}/> Nova operação</button>
        </div>
        {enriched.length === 0 ? (
          <div className="empty">Nenhum ativo nesta classe. Clique em "Nova operação" para começar.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Ativo</th><th className="num">Qtd</th><th className="num">PM</th><th className="num">Cotação</th><th className="num">Posição</th><th className="num">P&L</th><th className="num">Proventos</th><th></th></tr></thead>
            <tbody>
              {enriched.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: klass.color + "33", color: klass.color, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700 }}>{a.ticker.slice(0, 4)}</div>
                      <div>
                        <strong>{a.ticker}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{formatQty(a.m.qty)}</td>
                  <td className="num">{a.m.pm.toFixed(2)}</td>
                  <td className="num">
                    <span style={{ cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }} onClick={() => openPrice(a)} title="Atualizar cotação">
                      {a.m.currentPrice.toFixed(2)}
                    </span>
                    {a.lastPriceUpdate && <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{fmtDate(a.lastPriceUpdate)}</div>}
                  </td>
                  <td className="num"><strong>{fmtBRL(a.m.position)}</strong></td>
                  <td className={"num " + (a.m.pnl >= 0 ? "pos" : "neg")}>{(a.m.pnl >= 0 ? "+" : "") + fmtBRL(a.m.pnl)}<div style={{ fontSize: 11, opacity: 0.8 }}>{(a.m.pnl >= 0 ? "+" : "") + a.m.pnlPct.toFixed(2) + "%"}</div></td>
                  <td className="num">{fmtBRL(a.m.divTotal)}</td>
                  <td className="num" style={{ whiteSpace: "nowrap" }}>
                    <button className="btn ghost sm" onClick={() => openOps(a)} title="Histórico"><Icon name="list" size={12}/></button>
                    <button className="btn ghost sm" onClick={() => openDividend(a)} title="Registrar provento" style={{ marginLeft: 4 }}>$</button>
                    <button className="btn ghost sm" onClick={() => removeAsset(a)} title="Excluir" style={{ marginLeft: 4 }}><Icon name="trash" size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---- Modal de histórico de operações + proventos ----
function AssetHistoryModal({ asset, onClose, onUpdate }) {
  const ops = [...(asset.operations || [])].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  const divs = [...(asset.dividends || [])].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  const m = computeAssetMetrics(asset);
  const delOp = (id) => onUpdate({ ...asset, operations: asset.operations.filter((o) => o.id !== id) });
  const delDiv = (id) => onUpdate({ ...asset, dividends: (asset.dividends || []).filter((d) => d.id !== id) });
  return (
    <Modal title={`${asset.ticker} · ${asset.name}`} subtitle={`Posição: ${formatQty(m.qty)} · PM: ${fmtBRL(m.pm)} · Valor: ${fmtBRL(m.position)}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)", marginBottom: 8 }}>Operações</div>
          {ops.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Sem operações.</div> : (
            <table className="table">
              <thead><tr><th>Data</th><th>Tipo</th><th className="num">Qtd</th><th className="num">Preço</th><th className="num">Total</th><th></th></tr></thead>
              <tbody>
                {ops.map((o) => (
                  <tr key={o.id}>
                    <td>{fmtDate(o.date)}</td>
                    <td><span className="chip" style={{ background: o.type === "buy" ? "var(--success-bg)" : "var(--danger-bg)", color: o.type === "buy" ? "var(--success)" : "var(--danger)", border: "none" }}>{o.type === "buy" ? "Compra" : "Venda"}</span></td>
                    <td className="num">{formatQty(o.qty)}</td>
                    <td className="num">{parseFloat(o.price).toFixed(2)}</td>
                    <td className="num"><strong>{fmtBRL(o.qty * o.price)}</strong></td>
                    <td className="num"><button className="btn ghost sm" onClick={() => delOp(o.id)}><Icon name="trash" size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)", marginBottom: 8 }}>Proventos</div>
          {divs.length === 0 ? <div className="muted" style={{ fontSize: 13 }}>Sem proventos registrados.</div> : (
            <table className="table">
              <thead><tr><th>Data</th><th className="num">Valor</th><th></th></tr></thead>
              <tbody>
                {divs.map((d) => (
                  <tr key={d.id}><td>{fmtDate(d.date)}</td><td className="num"><strong>{fmtBRL(d.amount)}</strong></td><td className="num"><button className="btn ghost sm" onClick={() => delDiv(d.id)}><Icon name="trash" size={12}/></button></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---- Página principal ----
function Investimentos({ state, setState }) {
  const [tab, setTab] = useState("visao");
  const [showOp, setShowOp] = useState(false);
  const [opInitialClass, setOpInitialClass] = useState(null);
  const [priceFor, setPriceFor] = useState(null);
  const [dividendFor, setDividendFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const assets = state.investments?.assets || [];

  const saveOp = ({ mode, asset, op, assetId }) => {
    let newAssets;
    if (mode === "new") {
      const a = { id: uid(), ...asset, operations: [{ id: uid(), ...op }], dividends: [], lastPriceUpdate: todayISO() };
      newAssets = [...assets, a];
    } else {
      newAssets = assets.map((a) => a.id === assetId ? { ...a, operations: [...(a.operations || []), { id: uid(), ...op }] } : a);
    }
    setState({ ...state, investments: { ...state.investments, assets: newAssets } });
    setShowOp(false); setOpInitialClass(null);
  };
  const updateAsset = (newAsset) => {
    const newAssets = assets.map((a) => a.id === newAsset.id ? newAsset : a);
    setState({ ...state, investments: { ...state.investments, assets: newAssets } });
    if (historyFor && historyFor.id === newAsset.id) setHistoryFor(newAsset);
  };
  const removeAsset = (a) => {
    if (!confirm(`Excluir ${a.ticker} e todo o histórico?`)) return;
    setState({ ...state, investments: { ...state.investments, assets: assets.filter((x) => x.id !== a.id) } });
  };
  const openNew = (klassId) => { setOpInitialClass(klassId); setShowOp(true); };

  const subtabs = [
    { id: "visao", label: "Visão geral" },
    { id: "tesouro-direto", label: "Tesouro Direto" },
    ...ASSET_CLASSES.map((c) => ({ id: c.id, label: c.name })),
  ];

  let content;
  if (tab === "visao") content = <VisaoGeral state={state} setState={setState}/>;
  else if (tab === "tesouro-direto") content = <Tesouro state={state} setState={setState}/>;
  else {
    const klass = classById(tab);
    content = <ClassPanel state={state} setState={setState} klass={klass}
      openNew={openNew}
      openPrice={(a) => setPriceFor(a)}
      openDividend={(a) => setDividendFor(a)}
      openOps={(a) => setHistoryFor(a)}
      removeAsset={removeAsset}/>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Investimentos</div>
          <div className="page-subtitle">Carteira consolidada — operações, cotações e proventos</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={() => exportRetirementJSON(state)}
            title="Exporta operações e aportes do Tesouro como JSON compatível com o app Retirement (srocupado/Retirement)">
            <Icon name="download" size={14}/> Exportar p/ Retirement
          </button>
          <button className="btn primary" onClick={() => { setOpInitialClass(null); setShowOp(true); }}>
            <Icon name="plus" size={14}/> Nova operação
          </button>
        </div>
      </div>

      <div className="subtabs">
        {subtabs.map((t) => (
          <div key={t.id}
            className={"subtab" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {content}

      {showOp && (
        <Modal title="Nova operação" subtitle="Compra ou venda de ativo" onClose={() => { setShowOp(false); setOpInitialClass(null); }}>
          <OperationForm initialClass={opInitialClass} assets={assets} onSave={saveOp} onCancel={() => { setShowOp(false); setOpInitialClass(null); }}/>
        </Modal>
      )}
      {priceFor && (
        <Modal title="Atualizar cotação" onClose={() => setPriceFor(null)}>
          <PriceForm asset={priceFor} onSave={(upd) => { updateAsset({ ...priceFor, ...upd }); setPriceFor(null); }} onCancel={() => setPriceFor(null)}/>
        </Modal>
      )}
      {dividendFor && (
        <Modal title="Registrar provento" onClose={() => setDividendFor(null)}>
          <DividendForm asset={dividendFor} onSave={(d) => { updateAsset({ ...dividendFor, dividends: [...(dividendFor.dividends || []), d] }); setDividendFor(null); }} onCancel={() => setDividendFor(null)}/>
        </Modal>
      )}
      {historyFor && <AssetHistoryModal asset={historyFor} onClose={() => setHistoryFor(null)} onUpdate={updateAsset}/>}
    </div>
  );
}

Object.assign(window, { Investimentos, ASSET_CLASSES });
