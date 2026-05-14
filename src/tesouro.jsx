// ===== Módulo Tesouro Direto IPCA+ =====

function ContributionForm({ initial, holdingName, holdingDefaultRate, onSave, onCancel }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [amount, setAmount] = useState(initial?.amount != null ? initial.amount : "");
  const [rate, setRate] = useState(
    initial && typeof initial.rate === "number"
      ? (initial.rate * 100).toFixed(2)
      : (typeof holdingDefaultRate === "number" ? (holdingDefaultRate * 100).toFixed(2) : "")
  );
  const submit = () => {
    const a = parseFloat(amount);
    if (!a || isNaN(a)) return alert("Informe o valor do aporte.");
    const out = { id: initial?.id || uid(), date, amount: Math.abs(a) };
    const r = parseFloat(rate);
    if (!isNaN(r)) out.rate = r / 100;
    onSave(out);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {holdingName && (
        <div className="muted" style={{ fontSize: 13 }}>
          {initial ? "Editar aporte em" : "Aportar em"} <strong style={{ color: "var(--text)" }}>{holdingName}</strong>
        </div>
      )}
      <div className="grid grid-2">
        <div className="field">
          <label>Data do aporte</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor (R$)</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus={!initial} />
        </div>
      </div>
      <div className="field">
        <label>Taxa real contratada (% a.a. acima do IPCA)</label>
        <input className="input" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="ex.: 6,87"/>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Trava na compra. Pré-preenchida com a taxa padrão do título; ajuste para refletir a taxa do dia.
        </div>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> {initial ? "Salvar aporte" : "Registrar aporte"}</button>
      </div>
    </div>
  );
}

function HoldingForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "Tesouro IPCA+ ");
  const [maturity, setMaturity] = useState(initial?.maturity || "2045-05-15");
  const [rate, setRate] = useState(initial ? (initial.rate * 100).toFixed(2) : "6.50");
  const [ipca, setIpca] = useState(initial ? (initial.ipcaAssumption * 100).toFixed(2) : "4.00");
  const submit = () => {
    if (!name) return alert("Informe o nome do título.");
    onSave({
      id: initial?.id || uid(),
      name, maturity,
      rate: parseFloat(rate) / 100,
      ipcaAssumption: parseFloat(ipca) / 100,
      contributions: initial?.contributions || [],
    });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label>Nome do título</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tesouro IPCA+ 2045" />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label>Vencimento</label>
          <input className="input" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </div>
        <div className="field">
          <label>Taxa padrão p/ novos aportes (% a.a.)</label>
          <input className="input" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Sugestão usada ao registrar aportes. Cada aporte pode ter sua própria taxa.</div>
        </div>
      </div>
      <div className="field">
        <label>IPCA premissa anual (%)</label>
        <input className="input" type="number" step="0.01" value={ipca} onChange={(e) => setIpca(e.target.value)} />
        <div className="muted" style={{ fontSize: 12 }}>Premissa para projeção. Rentabilidade nominal anual ≈ <strong className="tabular" style={{ color: "var(--text)" }}>{(((1 + parseFloat(ipca)/100) * (1 + parseFloat(rate)/100) - 1) * 100).toFixed(2)}%</strong></div>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn primary" onClick={submit}><Icon name="check" size={14}/> Salvar título</button>
      </div>
    </div>
  );
}

function Tesouro({ state, setState }) {
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [contribFor, setContribFor] = useState(null);
  const [expandedHoldings, setExpandedHoldings] = useState(() => new Set());
  const [editingContrib, setEditingContrib] = useState(null); // { holdingId, contrib }

  const toggleHolding = (id) => {
    setExpandedHoldings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // simulador
  const currentAge = new Date().getFullYear() - (state.settings.birthYear || 1985);
  const [simAge, setSimAge] = useState(state.settings.retireAge || 60);
  const [simMonthly, setSimMonthly] = useState(state.settings.retireMonthlyTarget || 8000);
  const [simContribute, setSimContribute] = useState(1500);
  const [simIpca, setSimIpca] = useState(4.0);
  const yearsToRetire = Math.max(0, simAge - currentAge);

  const totalInvested = state.treasuryHoldings.reduce((acc, h) => acc + holdingTotalContributed(h), 0);
  const totalCurrent = state.treasuryHoldings.reduce((acc, h) => acc + holdingCurrentValue(h), 0);
  const totalGain = totalCurrent - totalInvested;
  const totalAtMaturity = state.treasuryHoldings.reduce((acc, h) => acc + holdingValueAtMaturity(h), 0);

  // Taxa real média ponderada pelos títulos contratados (peso = valor atual).
  // Cada holding.rate é o spread real acima do IPCA contratado na compra.
  const weightedRealRate = totalCurrent > 0
    ? state.treasuryHoldings.reduce((acc, h) => acc + holdingEffectiveRate(h) * holdingCurrentValue(h), 0) / totalCurrent
    : 0.065; // fallback se ainda não há títulos cadastrados
  const simRate = weightedRealRate * 100; // exibida em %

  // Modelo: renda PERPÉTUA preservando o capital em termos reais (poder de compra).
  // Projetamos em R$ de hoje usando apenas a taxa real (acima do IPCA).
  // O patrimônio cresce nominalmente em IPCA+taxa_real; sacamos apenas o ganho real
  // e reinvestimos o componente IPCA → capital real constante para sempre.
  // IR Tesouro: 15% após 2 anos sobre o rendimento (alíquota mínima da tabela regressiva).
  const IR_RATE = 0.15;
  const realRate = parseFloat(simRate) / 100; // taxa real anual (spread acima do IPCA)
  const r = realRate; // usado para projeção em R$ de hoje

  // Patrimônio alvo: quanto preciso ter para gerar simMonthly LÍQUIDOS perpetuamente.
  // bruto mensal = líquido / (1 - IR);  patrimônio = bruto_anual / taxa_real
  const grossNeededMonthly = simMonthly / (1 - IR_RATE);
  const targetWealth = realRate > 0 ? (grossNeededMonthly * 12) / realRate : Infinity;

  // Projeção (em R$ de hoje) — FV com taxa real
  const fvCurrent = totalCurrent * Math.pow(1 + r, yearsToRetire);
  const fvContributions = r > 0
    ? simContribute * 12 * (Math.pow(1 + r, yearsToRetire) - 1) / r
    : simContribute * 12 * yearsToRetire;
  const projectedWealth = fvCurrent + fvContributions;

  const pctOfTarget = targetWealth && isFinite(targetWealth) ? Math.min(1, projectedWealth / targetWealth) : 0;
  // Renda mensal perpétua, líquida de IR
  const monthlyIncomeGross = (projectedWealth * realRate) / 12;
  const monthlyIncomeFromProjected = monthlyIncomeGross * (1 - IR_RATE);

  // série anual de patrimônio (gráfico)
  const series = [];
  for (let i = 0; i <= yearsToRetire; i++) {
    const fvCur = totalCurrent * Math.pow(1 + r, i);
    const fvCtr = simContribute * 12 * (Math.pow(1 + r, i) - 1) / r;
    series.push({ year: new Date().getFullYear() + i, age: currentAge + i, value: fvCur + fvCtr });
  }
  const seriesMax = Math.max(targetWealth, ...series.map(s => s.value));

  // ===== Handlers =====
  const saveHolding = (h) => {
    const exists = state.treasuryHoldings.find((x) => x.id === h.id);
    const treasuryHoldings = exists
      ? state.treasuryHoldings.map((x) => (x.id === h.id ? h : x))
      : [...state.treasuryHoldings, h];
    setState({ ...state, treasuryHoldings });
    setShowHoldingForm(false);
    setEditingHolding(null);
  };
  const deleteHolding = (id) => {
    if (!confirm("Excluir este título e todos os aportes?")) return;
    setState({ ...state, treasuryHoldings: state.treasuryHoldings.filter((h) => h.id !== id) });
  };
  const addContribution = (holdingId, contribution) => {
    const treasuryHoldings = state.treasuryHoldings.map((h) => h.id === holdingId
      ? { ...h, contributions: [...h.contributions, contribution] }
      : h);
    setState({ ...state, treasuryHoldings });
    setContribFor(null);
  };
  const deleteContribution = (holdingId, cid) => {
    const treasuryHoldings = state.treasuryHoldings.map((h) => h.id === holdingId
      ? { ...h, contributions: h.contributions.filter((c) => c.id !== cid) }
      : h);
    setState({ ...state, treasuryHoldings });
  };
  const updateContribution = (holdingId, updated) => {
    const treasuryHoldings = state.treasuryHoldings.map((h) => h.id === holdingId
      ? { ...h, contributions: h.contributions.map((c) => c.id === updated.id ? updated : c) }
      : h);
    setState({ ...state, treasuryHoldings });
    setEditingContrib(null);
  };
  const updateSettings = (patch) => {
    setState({ ...state, settings: { ...state.settings, ...patch } });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Aposentadoria</div>
          <div className="page-subtitle">Aportes, projeção e simulador de aposentadoria</div>
        </div>
        <button className="btn primary" onClick={() => { setEditingHolding(null); setShowHoldingForm(true); }}>
          <Icon name="plus" size={14}/> Novo título
        </button>
      </div>

      {/* hero */}
      <div className="card hero" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div className="metric-label">Valor atualizado da carteira</div>
            <div className="metric-value xl">{fmtBRL(totalCurrent)}</div>
            <div className="row center" style={{ gap: 12, marginTop: 8 }}>
              <span className="chip success"><Icon name="trending" size={11}/> + {fmtBRL(totalGain)}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                Aportado <strong className="tabular" style={{ color: "var(--text)" }}>{fmtBRL(totalInvested)}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
            <div>
              <div className="metric-label">Títulos ativos</div>
              <div className="metric-value sm">{state.treasuryHoldings.length}</div>
            </div>
            <div>
              <div className="metric-label">Total de aportes</div>
              <div className="metric-value sm">{state.treasuryHoldings.reduce((acc, h) => acc + h.contributions.length, 0)}</div>
            </div>
            <div>
              <div className="metric-label">Projetado nos vencimentos</div>
              <div className="metric-value sm" style={{ color: "var(--primary-2)" }}>{fmtBRL(totalAtMaturity)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* títulos */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        {state.treasuryHoldings.map((h) => {
          const cur = holdingCurrentValue(h);
          const con = holdingTotalContributed(h);
          const fin = holdingValueAtMaturity(h);
          const gain = cur - con;
          const yrs = ((parseDate(h.maturity) - new Date()) / (365.25 * 24 * 3600 * 1000));
          const effRate = holdingEffectiveRate(h);
          const missingCount = holdingMissingRateCount(h);
          const isOpen = expandedHoldings.has(h.id);
          return (
            <div key={h.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{h.name}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Venc. {fmtDate(h.maturity)} · {yrs > 0 ? `${yrs.toFixed(1)} anos` : "vencido"}
                  </div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn ghost icon-only sm" onClick={() => { setEditingHolding(h); setShowHoldingForm(true); }}><Icon name="edit" size={12}/></button>
                  <button className="btn ghost icon-only sm" onClick={() => deleteHolding(h.id)}><Icon name="trash" size={12}/></button>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <span className="chip primary" title="Taxa efetiva (média ponderada pelos valores atuais dos aportes)">IPCA + {(effRate * 100).toFixed(2).replace(".", ",")}%</span>
                <span className="chip">≈ {(((1 + h.ipcaAssumption) * (1 + effRate) - 1) * 100).toFixed(2).replace(".", ",")}% a.a.</span>
                {missingCount > 0 && (
                  <span className="chip" style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.4)" }} title="Aportes sem taxa contratada. Edite-os para registrar a taxa real.">
                    <Icon name="x" size={10}/> {missingCount} sem taxa
                  </span>
                )}
              </div>
              <div className="metric">
                <span className="metric-label">Valor atual</span>
                <span className="metric-value">{fmtBRL(cur)}</span>
                <span className={"metric-delta " + (gain >= 0 ? "up" : "down")} style={{ alignSelf: "flex-start" }}>
                  <Icon name="trending" size={11}/> {gain >= 0 ? "+ " : "− "}{fmtBRL(Math.abs(gain))}
                </span>
              </div>
              <div className="divider"/>
              <div className="row between" style={{ fontSize: 12, marginBottom: 6 }}>
                <span className="muted">Aportado</span>
                <span className="tabular">{fmtBRL(con)}</span>
              </div>
              <div className="row between" style={{ fontSize: 12, marginBottom: 14 }}>
                <span className="muted">No vencimento</span>
                <span className="tabular" style={{ color: "var(--primary-2)", fontWeight: 600 }}>{fmtBRL(fin)}</span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn primary sm" style={{ flex: 1 }} onClick={() => setContribFor(h)}><Icon name="plus" size={12}/> Aporte</button>
                <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => toggleHolding(h.id)} title={isOpen ? "Recolher aportes" : "Ver aportes"}>
                  <Icon name="chevron" size={12} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 150ms ease" }}/>
                  {isOpen ? "Recolher" : `Ver ${h.contributions.length} ${h.contributions.length === 1 ? "aporte" : "aportes"}`}
                </button>
              </div>
              {isOpen && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  {h.contributions.length === 0 ? (
                    <div className="empty" style={{ fontSize: 12 }}>Sem aportes ainda.</div>
                  ) : (
                    <table className="table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th className="num">Aportado</th>
                          <th className="num">Taxa</th>
                          <th className="num">Valor hoje</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.contributions.slice().sort((a, b) => parseDate(b.date) - parseDate(a.date)).map((c) => {
                          const cVal = projectContributionToToday(c, h.rate, h.ipcaAssumption);
                          const cGain = cVal - c.amount;
                          const hasRate = typeof c.rate === "number";
                          return (
                            <tr key={c.id}>
                              <td>{fmtDate(c.date)}</td>
                              <td className="num">{fmtBRL(c.amount)}</td>
                              <td className="num" style={hasRate ? null : { color: "#fca5a5", fontWeight: 600 }}>
                                {hasRate
                                  ? `IPCA + ${(c.rate * 100).toFixed(2).replace(".", ",")}%`
                                  : <span title="Sem taxa contratada — clique no lápis para registrar">—</span>}
                              </td>
                              <td className="num pos">{fmtBRL(cVal)} <span className="muted" style={{ fontSize: 10 }}>(+{fmtBRL(cGain)})</span></td>
                              <td className="num">
                                <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                                  <button className="btn ghost icon-only sm" onClick={() => setEditingContrib({ holdingId: h.id, contrib: c })} title="Editar aporte"><Icon name="edit" size={12}/></button>
                                  <button className="btn ghost icon-only sm" onClick={() => deleteContribution(h.id, c.id)} title="Excluir aporte"><Icon name="trash" size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* simulador */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ margin: 0 }}>Simulador de aposentadoria</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Você tem hoje <strong style={{ color: "var(--text)" }}>{currentAge} anos</strong> ·
              Faltam <strong style={{ color: "var(--text)" }}>{yearsToRetire} anos</strong> até a aposentadoria
            </div>
          </div>
          <span className="chip primary"><Icon name="target" size={11}/> meta</span>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 22 }}>
          <div className="field">
            <label>Idade atual (ano de nascimento)</label>
            <input className="input" type="number" value={state.settings.birthYear} onChange={(e) => updateSettings({ birthYear: parseInt(e.target.value) })}/>
          </div>
          <div className="field">
            <label>Aposentar com</label>
            <input className="input" type="number" value={simAge} onChange={(e) => { setSimAge(parseInt(e.target.value)); updateSettings({ retireAge: parseInt(e.target.value) }); }}/>
          </div>
          <div className="field">
            <label>Renda mensal desejada</label>
            <input className="input" type="number" value={simMonthly} onChange={(e) => { setSimMonthly(parseFloat(e.target.value)); updateSettings({ retireMonthlyTarget: parseFloat(e.target.value) }); }}/>
          </div>
          <div className="field">
            <label>Aporte mensal (R$)</label>
            <input className="input" type="number" value={simContribute} onChange={(e) => setSimContribute(parseFloat(e.target.value))}/>
          </div>
          <div className="field">
            <label>Taxa real média (% a.a., acima do IPCA)</label>
            <input className="input" type="number" value={simRate.toFixed(2)} disabled style={{ opacity: 0.85, cursor: "not-allowed" }} />
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {state.treasuryHoldings.length > 0
                ? `média ponderada de ${state.treasuryHoldings.length} título(s) por valor atual`
                : "nenhum título cadastrado — usando padrão 6,5%"}
            </div>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 22 }}>
          <div style={{ padding: 18, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
            <div className="metric-label">Patrimônio necessário</div>
            <div className="metric-value">{fmtBRL(targetWealth)}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>renda perpétua líquida · preserva capital</div>
          </div>
          <div style={{ padding: 18, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
            <div className="metric-label">Projetado em {simAge} anos</div>
            <div className="metric-value" style={{ color: projectedWealth >= targetWealth ? "var(--success)" : "var(--text)" }}>{fmtBRL(projectedWealth)}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>com aporte de {fmtBRL(simContribute)}/mês</div>
          </div>
          <div style={{ padding: 18, background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
            <div className="metric-label">Renda mensal líquida</div>
            <div className="metric-value" style={{ color: monthlyIncomeFromProjected >= simMonthly ? "var(--success)" : "var(--warning)" }}>{fmtBRL(monthlyIncomeFromProjected)}</div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>perpétua · vs. desejada {fmtBRL(simMonthly)} · IR 15%</div>
          </div>
        </div>

        <div>
          <div className="row between" style={{ fontSize: 12, marginBottom: 8 }}>
            <span className="muted">Progresso da meta</span>
            <span className="tabular" style={{ fontWeight: 600 }}>{(pctOfTarget * 100).toFixed(0)}%</span>
          </div>
          <div className={"progress " + (pctOfTarget >= 1 ? "success" : pctOfTarget >= 0.6 ? "" : "warn")} style={{ height: 12 }}>
            <div className="bar" style={{ width: (pctOfTarget * 100) + "%" }}/>
          </div>
        </div>

        {/* projeção anual */}
        <div style={{ marginTop: 26 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Projeção do patrimônio até a aposentadoria</div>
          <div style={{ position: "relative" }}>
            <svg viewBox={`0 0 ${Math.max(400, series.length * 30)} 240`} preserveAspectRatio="none" style={{ width: "100%", height: 240, display: "block" }}>
              {/* grid */}
              {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
                <line key={i} x1="0" x2={Math.max(400, series.length * 30)} y1={20 + g * 200} y2={20 + g * 200}
                  stroke="var(--border)" strokeDasharray="3 4"/>
              ))}
              {/* target line */}
              <line x1="0" x2={Math.max(400, series.length * 30)}
                y1={220 - (targetWealth / seriesMax) * 200}
                y2={220 - (targetWealth / seriesMax) * 200}
                stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7"/>
              <text x={Math.max(400, series.length * 30) - 4} y={220 - (targetWealth / seriesMax) * 200 - 6}
                fill="var(--accent)" fontSize="10" textAnchor="end">Meta {fmtBRLCompact(targetWealth)}</text>
              {/* area */}
              <path
                d={[
                  "M 0 220",
                  ...series.map((s, i) => `L ${(i / Math.max(1, series.length - 1)) * Math.max(400, series.length * 30)} ${220 - (s.value / seriesMax) * 200}`),
                  `L ${Math.max(400, series.length * 30)} 220`,
                  "Z"
                ].join(" ")}
                fill="url(#grad-area)" opacity="0.4"/>
              <defs>
                <linearGradient id="grad-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-2)" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="var(--primary-2)" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* line */}
              <path
                d={series.map((s, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(1, series.length - 1)) * Math.max(400, series.length * 30)} ${220 - (s.value / seriesMax) * 200}`).join(" ")}
                fill="none" stroke="var(--primary-2)" strokeWidth="2.5" strokeLinejoin="round"/>
              {/* end point */}
              {series.length > 0 && (
                <circle cx={Math.max(400, series.length * 30)} cy={220 - (series[series.length - 1].value / seriesMax) * 200} r="4" fill="var(--primary-2)"/>
              )}
            </svg>
            <div className="row between muted" style={{ fontSize: 11, marginTop: 6 }}>
              <span>{currentAge} anos · {new Date().getFullYear()}</span>
              <span>{simAge} anos · {new Date().getFullYear() + yearsToRetire}</span>
            </div>
          </div>
        </div>
      </div>

      {/* modais */}
      {showHoldingForm && (
        <Modal
          title={editingHolding ? "Editar título" : "Novo título IPCA+"}
          subtitle="Tesouro Direto"
          onClose={() => { setShowHoldingForm(false); setEditingHolding(null); }}>
          <HoldingForm initial={editingHolding} onSave={saveHolding} onCancel={() => { setShowHoldingForm(false); setEditingHolding(null); }}/>
        </Modal>
      )}
      {contribFor && (
        <Modal title="Novo aporte" subtitle={contribFor.name} onClose={() => setContribFor(null)}>
          <ContributionForm
            holdingName={contribFor.name}
            holdingDefaultRate={contribFor.rate}
            onSave={(c) => addContribution(contribFor.id, c)}
            onCancel={() => setContribFor(null)}
          />
        </Modal>
      )}
      {editingContrib && (() => {
        const parent = state.treasuryHoldings.find((x) => x.id === editingContrib.holdingId);
        if (!parent) return null;
        return (
          <Modal title="Editar aporte" subtitle={parent.name} onClose={() => setEditingContrib(null)}>
            <ContributionForm
              initial={editingContrib.contrib}
              holdingName={parent.name}
              holdingDefaultRate={parent.rate}
              onSave={(c) => updateContribution(parent.id, c)}
              onCancel={() => setEditingContrib(null)}
            />
          </Modal>
        );
      })()}
    </div>
  );
}

Object.assign(window, { Tesouro });
