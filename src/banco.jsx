// ===== Módulo Banco / Saldo =====

function BankEntryForm({ initial, onSave, onCancel, state, setState }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [desc, setDesc] = useState(initial?.desc || "");
  const [category, setCategory] = useState(initial?.category || "outros");
  const [type, setType] = useState(initial?.type || "debit");
  const [amount, setAmount] = useState(initial ? Math.abs(initial.amount) : "");
  const [isCardPayment, setIsCardPayment] = useState(initial?.isCardPayment || false);
  const [isInvestment, setIsInvestment] = useState(initial?.isInvestment || false);
  const [recurring, setRecurring] = useState(initial?.recurring === true);
  const [recurringEndMonth, setRecurringEndMonth] = useState(initial?.recurringEndMonth || "");
  const isCopy = !!initial?.recurringFrom;

  const submit = () => {
    const a = parseFloat(amount);
    if (!desc || !a || isNaN(a)) return alert("Preencha descrição e valor.");
    const signed = type === "credit" ? Math.abs(a) : -Math.abs(a);
    const out = {
      id: initial?.id || uid(),
      date, desc, category, type,
      amount: signed,
      isCardPayment, isInvestment,
    };
    if (isCopy) {
      out.recurringFrom = initial.recurringFrom;
    } else {
      out.recurring = recurring;
      if (recurring && recurringEndMonth) out.recurringEndMonth = recurringEndMonth;
      if (Array.isArray(initial?.recurringExcludedMonths)) out.recurringExcludedMonths = initial.recurringExcludedMonths;
    }
    onSave(out);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="grid grid-2">
        <div className="field">
          <label>Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Tipo</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="credit">Crédito (entrada)</option>
            <option value="debit">Débito (saída)</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Descrição</label>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Salário, aluguel, mercado…" />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label>Categoria</label>
          <CategorySelect state={state} setState={setState} value={category} onChange={setCategory} />
        </div>
        <div className="field">
          <label>Valor (R$)</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
      </div>
      {type === "debit" && (
        <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="row center" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={isCardPayment} onChange={(e) => setIsCardPayment(e.target.checked)}/>
            Este débito é o pagamento da fatura do cartão
          </label>
          <label className="row center" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={isInvestment} onChange={(e) => setIsInvestment(e.target.checked)}/>
            Este débito é um aporte em investimento
          </label>
        </div>
      )}
      {!isCopy && (
        <div style={{ background: "var(--surface)", padding: 12, borderRadius: 10, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <label className="row center" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)}/>
            <Icon name="repeat" size={13}/> Repetir mensalmente
          </label>
          {recurring && (
            <div className="field" style={{ marginTop: 4 }}>
              <label>Repetir até (mês/ano)</label>
              <input className="input" type="month" value={recurringEndMonth} onChange={(e) => setRecurringEndMonth(e.target.value)}/>
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Vazio = indefinido. Cópias são geradas no mesmo dia do mês.</div>
            </div>
          )}
        </div>
      )}
      {isCopy && (
        <div className="muted" style={{ fontSize: 12, padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <Icon name="repeat" size={12}/> Esta é uma ocorrência gerada por um lançamento recorrente. Edite o lançamento original para mudar valor/categoria futuros.
        </div>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> Salvar</button>
      </div>
    </div>
  );
}

function Banco({ state, setState }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all"); // all / credit / debit
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const balance = getBankBalance(state.bankTransactions);
  const monthFlow = getMonthlyFlow(state.bankTransactions, viewYear, viewMonth);

  // saldo projetado: subtrai próxima fatura do cartão
  const billNext = getCardBillForMonth(state.cardEntries, now.getFullYear(), now.getMonth() + 1);
  const projectedAfterBill = balance - billNext.total;

  const txsOfMonth = state.bankTransactions
    .filter((t) => {
      const d = parseDate(t.date);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .filter((t) => filter === "all" ? true : (filter === "credit" ? t.amount > 0 : t.amount < 0))
    .sort((a, b) => parseDate(b.date) - parseDate(a.date));

  // últimos 6 meses para sparkline / chart
  const flowMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const f = getMonthlyFlow(state.bankTransactions, d.getFullYear(), d.getMonth());
    flowMonths.push({ label: fmtMonth(d), ...f });
  }

  const saveTx = (tx) => {
    const exists = state.bankTransactions.find((t) => t.id === tx.id);
    const bankTransactions = exists
      ? state.bankTransactions.map((t) => (t.id === tx.id ? tx : t))
      : [...state.bankTransactions, tx];
    setState({ ...state, bankTransactions });
    setShowForm(false);
    setEditing(null);
  };
  const deleteTx = (id) => {
    if (!confirm("Excluir transação?")) return;
    const tx = state.bankTransactions.find((t) => t.id === id);
    let bankTransactions = state.bankTransactions.filter((t) => t.id !== id);
    if (tx?.recurringFrom) {
      const ym = monthKey(parseDate(tx.date));
      bankTransactions = bankTransactions.map((t) => {
        if (t.id !== tx.recurringFrom) return t;
        const excl = Array.isArray(t.recurringExcludedMonths) ? t.recurringExcludedMonths : [];
        if (excl.includes(ym)) return t;
        return { ...t, recurringExcludedMonths: [...excl, ym] };
      });
    }
    setState({ ...state, bankTransactions });
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  // saldo acumulado (running balance) do mês
  const sortedAsc = [...state.bankTransactions].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  let running = 0;
  const runningMap = {};
  sortedAsc.forEach((t) => {
    running += t.amount;
    runningMap[t.id] = running;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Saldo em Banco</div>
          <div className="page-subtitle">Conta corrente — débitos, créditos e conciliação com cartão</div>
        </div>
        <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Icon name="plus" size={14}/> Nova transação
        </button>
      </div>

      {/* hero saldo */}
      <div className="card hero" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div className="metric-label">Saldo atual</div>
            <div className="metric-value xl" style={{ color: balance >= 0 ? "var(--text)" : "var(--danger)" }}>{fmtBRL(balance)}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              Após pagamento da próxima fatura ({fmtBRL(billNext.total)}):
              <strong className="tabular" style={{ color: projectedAfterBill >= 0 ? "var(--success)" : "var(--danger)", marginLeft: 6 }}>
                {fmtBRL(projectedAfterBill)}
              </strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div className="metric-label">Entradas no mês</div>
              <div className="metric-value sm" style={{ color: "var(--success)" }}>+ {fmtBRL(monthFlow.credits)}</div>
            </div>
            <div>
              <div className="metric-label">Saídas no mês</div>
              <div className="metric-value sm" style={{ color: "var(--danger)" }}>− {fmtBRL(monthFlow.debits)}</div>
            </div>
            <div>
              <div className="metric-label">Resultado</div>
              <div className="metric-value sm" style={{ color: monthFlow.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                {monthFlow.net >= 0 ? "+ " : "− "}{fmtBRL(Math.abs(monthFlow.net))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mini chart 6 meses */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title" style={{ margin: 0 }}>Fluxo dos últimos 6 meses</div>
        </div>
        <div className="bar-chart">
          {flowMonths.map((f) => {
            const max = Math.max(1, ...flowMonths.map((x) => Math.max(x.credits, x.debits)));
            return (
              <div className="bar-col" key={f.label}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, width: "100%", height: 140 }}>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, #4ADE80, #16A34A)", borderRadius: "4px 4px 0 0", height: ((f.credits / max) * 140) + "px", minHeight: 2 }} title={`Entradas: ${fmtBRL(f.credits)}`}/>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, #F87171, #DC2626)", borderRadius: "4px 4px 0 0", height: ((f.debits / max) * 140) + "px", minHeight: 2 }} title={`Saídas: ${fmtBRL(f.debits)}`}/>
                </div>
                <div className="lbl">{f.label}</div>
                <div className="val" style={{ color: f.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {f.net >= 0 ? "+" : "−"}{fmtBRLCompact(Math.abs(f.net)).replace("R$ ", "")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* histórico */}
      <div className="card">
        <div className="card-header">
          <div className="row center" style={{ gap: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>Histórico</div>
            <div className="row center" style={{ gap: 6 }}>
              <button className="btn ghost icon-only sm" onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
              }}><Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }}/></button>
              <span style={{ fontSize: 13, textTransform: "capitalize", minWidth: 130, textAlign: "center" }}>{monthLabel}</span>
              <button className="btn ghost icon-only sm" onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
              }}><Icon name="chevron" size={14}/></button>
            </div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className={"btn sm " + (filter === "all" ? "primary" : "ghost")} onClick={() => setFilter("all")}>Todos</button>
            <button className={"btn sm " + (filter === "credit" ? "primary" : "ghost")} onClick={() => setFilter("credit")}>Entradas</button>
            <button className={"btn sm " + (filter === "debit" ? "primary" : "ghost")} onClick={() => setFilter("debit")}>Saídas</button>
          </div>
        </div>

        {txsOfMonth.length === 0 ? (
          <div className="empty">Nenhuma transação no período.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="num">Valor</th>
                <th className="num">Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {txsOfMonth.map((t) => {
                const c = categoryById(t.category);
                const isPos = t.amount > 0;
                return (
                  <tr key={t.id}>
                    <td className="muted">{fmtDate(t.date)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.desc}</div>
                      <div className="row" style={{ gap: 6, marginTop: 2 }}>
                        {t.isCardPayment && <span className="chip primary" style={{ fontSize: 10 }}><Icon name="card" size={10}/> fatura cartão</span>}
                        {t.isInvestment && <span className="chip info" style={{ fontSize: 10 }}><Icon name="treasury" size={10}/> investimento</span>}
                        {(t.recurring || t.recurringFrom) && <span className="chip" style={{ fontSize: 10 }} title={t.recurring ? "Fonte recorrente" : "Ocorrência gerada"}><Icon name="repeat" size={10}/> recorrente</span>}
                      </div>
                    </td>
                    <td><span className="chip"><span className="cat-dot" style={{ background: c.color }}/>{c.name}</span></td>
                    <td className={"num " + (isPos ? "pos" : "neg")}>
                      {isPos ? "+ " : "− "}{fmtBRL(Math.abs(t.amount))}
                    </td>
                    <td className="num muted">{fmtBRL(runningMap[t.id])}</td>
                    <td className="num">
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <button className="btn ghost icon-only sm" onClick={() => { setEditing(t); setShowForm(true); }}><Icon name="edit" size={12}/></button>
                        <button className="btn ghost icon-only sm" onClick={() => deleteTx(t.id)}><Icon name="trash" size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal
          title={editing ? "Editar transação" : "Nova transação"}
          subtitle="Conta corrente"
          onClose={() => { setShowForm(false); setEditing(null); }}>
          <BankEntryForm
            initial={editing}
            onSave={saveTx}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            state={state}
            setState={setState}
          />
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { Banco });
