// ===== Módulo Cartão de Crédito =====

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between center">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CardEntryForm({ initial, onSave, onCancel, state, setState }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [desc, setDesc] = useState(initial?.desc || "");
  const [category, setCategory] = useState(initial?.category || "outros");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [installments, setInstallments] = useState(initial?.installments || 1);
  const [currentInstallment, setCurrentInstallment] = useState(initial?.currentInstallment || 1);

  const submit = () => {
    const a = parseFloat(amount);
    if (!desc || !a || isNaN(a)) return alert("Preencha descrição e valor.");
    onSave({
      id: initial?.id || uid(),
      date, desc, category,
      amount: Math.abs(a),
      installments: Math.max(1, parseInt(installments) || 1),
      currentInstallment: Math.max(1, parseInt(currentInstallment) || 1),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="grid grid-2">
        <div className="field">
          <label>{parseInt(installments) > 1 ? "Data da parcela atual" : "Data da compra"}</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Categoria</label>
          <CategorySelect state={state} setState={setState} value={category} onChange={setCategory} />
        </div>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Mercado, viagem, restaurante…" />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label>Valor total (R$)</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div className="field">
          <label>Parcelas</label>
          <input className="input" type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} />
        </div>
      </div>
      {parseInt(installments) > 1 && (
        <div className="field">
          <label>Parcela atual (1 = primeira)</label>
          <input className="input" type="number" min="1" max={installments} value={currentInstallment} onChange={(e) => setCurrentInstallment(e.target.value)} />
          <div className="muted" style={{ fontSize: 12 }}>
            Valor por parcela: <strong className="tabular" style={{ color: "var(--text)" }}>{amount && installments ? fmtBRL(parseFloat(amount) / parseInt(installments)) : "—"}</strong>
          </div>
        </div>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> Salvar</button>
      </div>
    </div>
  );
}

function Cartao({ state, setState }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const bill = getCardBillForMonth(state.cardEntries, viewYear, viewMonth);
  const limit = state.settings.cardLimit || 0;
  const limitPct = limit ? Math.min(1, bill.total / limit) : 0;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const dueDate = new Date(viewYear, viewMonth, state.settings.cardDueDay || 5);

  // categorias agregadas
  const byCat = {};
  bill.items.forEach((it) => {
    byCat[it.category] = (byCat[it.category] || 0) + it.installmentValue;
  });
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  // próximas faturas (3 meses à frente)
  const upcoming = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(viewYear, viewMonth + i, 1);
    const b = getCardBillForMonth(state.cardEntries, d.getFullYear(), d.getMonth());
    upcoming.push({ date: d, total: b.total, count: b.items.length });
  }

  // compromissos parcelados ativos (com parcelas restantes)
  const activeInstallments = state.cardEntries
    .filter((e) => e.installments > 1)
    .map((e) => {
      const start = parseDate(e.date);
      const monthsSince = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const baseInst = Math.max(1, parseInt(e.currentInstallment) || 1);
      const current = Math.min(e.installments, Math.max(1, monthsSince + baseInst));
      const remaining = e.installments - current + 1;
      return { ...e, currentNow: current, remaining, perInstallment: e.amount / e.installments };
    })
    .filter((e) => e.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const saveEntry = (entry) => {
    const exists = state.cardEntries.find((e) => e.id === entry.id);
    const cardEntries = exists
      ? state.cardEntries.map((e) => (e.id === entry.id ? entry : e))
      : [...state.cardEntries, entry];
    setState({ ...state, cardEntries });
    setShowForm(false);
    setEditing(null);
  };
  const deleteEntry = (id) => {
    if (!confirm("Excluir este lançamento?")) return;
    setState({ ...state, cardEntries: state.cardEntries.filter((e) => e.id !== id) });
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cartão de Crédito</div>
          <div className="page-subtitle">Lançamentos, fatura e parcelamentos</div>
        </div>
        <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Icon name="plus" size={14}/> Novo lançamento
        </button>
      </div>

      {/* fatura hero */}
      <div className="card hero" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="row center" style={{ gap: 8, marginBottom: 8 }}>
              <button className="btn ghost icon-only sm" onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
              }}><Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }}/></button>
              <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel}</div>
              <button className="btn ghost icon-only sm" onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
              }}><Icon name="chevron" size={14}/></button>
              {isCurrentMonth && <span className="chip primary">Mês atual</span>}
            </div>
            <div className="metric-label">Total da fatura</div>
            <div className="metric-value xl">{fmtBRL(bill.total)}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              <Icon name="calendar" size={12}/> Vencimento em <strong style={{ color: "var(--text)" }}>{fmtDate(dueDate)}</strong>
              <span style={{ margin: "0 8px" }}>·</span>
              <strong style={{ color: "var(--text)" }}>{bill.items.length}</strong> {bill.items.length === 1 ? "lançamento" : "lançamentos"}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
            <div className="row between" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
              <span>Limite utilizado</span>
              <span className="tabular">{(limitPct * 100).toFixed(0)}%</span>
            </div>
            <div className={"progress " + (limitPct > 0.8 ? "danger" : limitPct > 0.6 ? "warn" : "")} style={{ height: 12 }}>
              <div className="bar" style={{ width: (limitPct * 100) + "%" }}/>
            </div>
            <div className="row between" style={{ marginTop: 8, fontSize: 13 }}>
              <span className="tabular">{fmtBRL(bill.total)} usados</span>
              <span className="tabular muted">{fmtBRL(Math.max(0, limit - bill.total))} disponível</span>
            </div>
            <div className="divider" style={{ margin: "16px 0 12px" }}/>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Limite total: <strong style={{ color: "var(--text)" }} className="tabular">{fmtBRL(limit)}</strong></div>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        {/* gastos por categoria */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ margin: 0 }}>Gastos por categoria — {monthLabel.split(" ")[0]}</div>
          </div>
          {catEntries.length === 0 ? (
            <div className="empty">Sem lançamentos neste mês.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {catEntries.map(([catId, val]) => {
                const c = categoryById(catId);
                const pct = bill.total ? val / bill.total : 0;
                return (
                  <div key={catId}>
                    <div className="row between" style={{ marginBottom: 6, fontSize: 13 }}>
                      <span className="row center" style={{ gap: 8 }}>
                        <span className="cat-dot" style={{ background: c.color }}/>
                        {c.name}
                      </span>
                      <span className="tabular" style={{ fontWeight: 600 }}>{fmtBRL(val)} <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>{(pct * 100).toFixed(0)}%</span></span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div className="bar" style={{ width: (pct * 100) + "%", background: c.color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* próximas faturas */}
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ margin: 0 }}>Próximas faturas</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((u, i) => (
              <div key={i} className="row between center" style={{
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>
                    {u.date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>{u.count} {u.count === 1 ? "item" : "itens"}</div>
                </div>
                <div className="tabular" style={{ fontSize: 16, fontWeight: 600 }}>{fmtBRL(u.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* parcelamentos ativos */}
      {activeInstallments.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <div className="card-title" style={{ margin: 0 }}>Compras parceladas ativas</div>
            <span className="chip">{activeInstallments.length}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Compra</th>
                <th>Categoria</th>
                <th>Progresso</th>
                <th className="num">Parcela</th>
                <th className="num">Restam</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeInstallments.map((e) => {
                const c = categoryById(e.category);
                const pct = e.currentNow / e.installments;
                return (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{e.desc}</div>
                      <div className="muted" style={{ fontSize: 11 }}>desde {fmtDate(e.date)}</div>
                    </td>
                    <td><span className="chip"><span className="cat-dot" style={{ background: c.color }}/>{c.name}</span></td>
                    <td style={{ minWidth: 140 }}>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="bar" style={{ width: (pct * 100) + "%" }}/>
                      </div>
                    </td>
                    <td className="num"><strong>{e.currentNow}</strong>/{e.installments}</td>
                    <td className="num">{e.remaining}x <span className="muted">de {fmtBRL(e.perInstallment)}</span></td>
                    <td className="num">{fmtBRL(e.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* tabela completa de lançamentos do mês */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ margin: 0 }}>Lançamentos da fatura</div>
        </div>
        {bill.items.length === 0 ? (
          <div className="empty">Nenhum lançamento neste mês.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="num">Parcela</th>
                <th className="num">Valor mês</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bill.items.sort((a, b) => parseDate(a.date) - parseDate(b.date)).map((it) => {
                const c = categoryById(it.category);
                return (
                  <tr key={it.id + "-" + it.installmentNum}>
                    <td className="muted">{fmtDate(it.date)}</td>
                    <td style={{ fontWeight: 500 }}>{it.desc}</td>
                    <td><span className="chip"><span className="cat-dot" style={{ background: c.color }}/>{c.name}</span></td>
                    <td className="num">
                      {it.installmentTotal > 1
                        ? <span className="chip primary">{it.installmentNum}/{it.installmentTotal}</span>
                        : <span className="muted">à vista</span>}
                    </td>
                    <td className="num neg">− {fmtBRL(it.installmentValue)}</td>
                    <td className="num">
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn ghost icon-only sm" onClick={() => { setEditing(it); setShowForm(true); }}><Icon name="edit" size={12}/></button>
                        <button className="btn ghost icon-only sm" onClick={() => deleteEntry(it.id)}><Icon name="trash" size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: "right", padding: "16px 12px", fontWeight: 600 }}>Total da fatura</td>
                <td className="num" style={{ padding: "16px 12px", fontWeight: 700, fontSize: 16 }}>{fmtBRL(bill.total)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {showForm && (
        <Modal
          title={editing ? "Editar lançamento" : "Novo lançamento"}
          subtitle="Cartão de crédito"
          onClose={() => { setShowForm(false); setEditing(null); }}>
          <CardEntryForm
            initial={editing}
            onSave={saveEntry}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            state={state}
            setState={setState}
          />
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { Cartao, Modal });
