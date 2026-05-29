// ===== Dashboard: Visão Geral consolidada =====

function Dashboard({ state, setPage }) {
  const now = new Date();
  const y = now.getFullYear(),m = now.getMonth();

  // banco
  const bankBalance = getBankBalance(state.bankTransactions);
  const monthFlow = getMonthlyFlow(state.bankTransactions, y, m);

  // cartão — fatura atual (aberta) e fatura fechada (a pagar)
  const currentBilling = billingMonthOf(now, state.settings.cardClosingDay || 31);
  const prevYear = currentBilling.month === 0 ? currentBilling.year - 1 : currentBilling.year;
  const prevMonth = currentBilling.month === 0 ? 11 : currentBilling.month - 1;
  const bill = getCardBillForMonth(state.cardEntries, currentBilling.year, currentBilling.month);
  const billClosed = getCardBillForMonth(state.cardEntries, prevYear, prevMonth);
  const usedLimit = bill.total;
  const limit = state.settings.cardLimit || 0;
  const limitPct = limit ? Math.min(1, usedLimit / limit) : 0;

  // tesouro
  const totalInvested = state.treasuryHoldings.reduce((acc, h) => acc + holdingTotalContributed(h), 0);
  const totalCurrent = state.treasuryHoldings.reduce((acc, h) => acc + holdingCurrentValue(h), 0);
  const totalGain = totalCurrent - totalInvested;
  const totalAtMaturity = state.treasuryHoldings.reduce((acc, h) => acc + holdingValueAtMaturity(h), 0);

  // patrimônio total = banco + tesouro
  const netWorth = bankBalance + totalCurrent;

  // últimos 6 meses fluxo
  const flowMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    const f = getMonthlyFlow(state.bankTransactions, d.getFullYear(), d.getMonth());
    flowMonths.push({ label: fmtMonth(d), ...f });
  }
  const flowMax = Math.max(1, ...flowMonths.map((f) => Math.max(f.credits, f.debits)));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Visão Geral</div>
          <div className="page-subtitle">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </div>

      {/* hero */}
      <div className="card hero" style={{ marginBottom: 18 }}>
        <div className="row between center" style={{ alignItems: "flex-start" }}>
          <div className="metric">
            <span className="metric-label">Saldo bancário atual</span>
            <span className="metric-value xl" style={{ color: bankBalance >= 0 ? "var(--text)" : "var(--danger)" }}>{fmtBRL(bankBalance)}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              Investimentos <strong style={{ color: "var(--text)" }}>{fmtBRL(totalCurrent)}</strong>
              <span style={{ margin: "0 8px" }}>·</span>
              Patrimônio total <strong style={{ color: "var(--text)" }}>{fmtBRL(netWorth)}</strong>
            </span>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div className="metric">
              <span className="metric-label">Mês — Entradas</span>
              <span className="metric-value sm" style={{ color: "var(--success)" }}>+ {fmtBRL(monthFlow.credits)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Mês — Saídas</span>
              <span className="metric-value sm" style={{ color: "var(--danger)" }}>− {fmtBRL(monthFlow.debits)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Saldo do mês</span>
              <span className="metric-value sm" style={{ color: monthFlow.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                {monthFlow.net >= 0 ? "+ " : "− "}{fmtBRL(Math.abs(monthFlow.net))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 module cards */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card" style={{ cursor: "pointer" }} onClick={() => setPage("cartao")}>
          <div className="card-header">
            <div className="row center" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-glow)", display: "grid", placeItems: "center", color: "var(--primary-2)" }}>
                <Icon name="card" size={16} />
              </div>
              <div className="card-title" style={{ margin: 0 }}>Cartão de Crédito</div>
            </div>
            <Icon name="chevron" size={14} />
          </div>
          <div className="metric">
            <span className="metric-label">Fatura atual</span>
            <span className="metric-value">{fmtBRL(bill.total)}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="row between" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
              <span>Limite usado</span>
              <span className="tabular">{fmtBRL(usedLimit)} / {fmtBRL(limit)}</span>
            </div>
            <div className={"progress " + (limitPct > 0.8 ? "danger" : limitPct > 0.6 ? "warn" : "")}>
              <div className="bar" style={{ width: limitPct * 100 + "%" }}></div>
            </div>
          </div>
          <div className="row between" style={{ marginTop: 14, fontSize: 12, color: "var(--text-dim)" }}>
            <span>Fatura fechada (a pagar)</span>
            <span className="tabular" style={{ color: "var(--text)" }}>{fmtBRL(billClosed.total)}</span>
          </div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => setPage("banco")}>
          <div className="card-header">
            <div className="row center" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-glow)", display: "grid", placeItems: "center", color: "var(--primary-2)" }}>
                <Icon name="bank" size={16} />
              </div>
              <div className="card-title" style={{ margin: 0 }}>Saldo em Banco</div>
            </div>
            <Icon name="chevron" size={14} />
          </div>
          <div className="metric">
            <span className="metric-label">Saldo atual</span>
            <span className="metric-value" style={{ color: bankBalance >= 0 ? "var(--text)" : "var(--danger)" }}>{fmtBRL(bankBalance)}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="row between" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
              <span>Últimos 6 meses</span>
              <span className="tabular">líquido</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 50 }}>
              {flowMonths.map((f) => {
                const h = Math.max(2, Math.abs(f.net) / flowMax * 50);
                return (
                  <div key={f.label} title={`${f.label}: ${fmtBRL(f.net)}`}
                  style={{ flex: 1, height: h + "px", background: f.net >= 0 ? "linear-gradient(180deg, #4ADE80, #16A34A)" : "linear-gradient(180deg, #F87171, #DC2626)", borderRadius: 3 }} />);

              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>
              {flowMonths.map((f) => <span key={f.label}>{f.label.split(".")[0]}</span>)}
            </div>
          </div>
        </div>

        <div className="card" style={{ cursor: "pointer" }} onClick={() => setPage("tesouro")}>
          <div className="card-header">
            <div className="row center" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-glow)", display: "grid", placeItems: "center", color: "var(--primary-2)" }}>
                <Icon name="treasury" size={16} />
              </div>
              <div className="card-title" style={{ margin: 0 }}>Tesouro Direto</div>
            </div>
            <Icon name="chevron" size={14} />
          </div>
          <div className="metric">
            <span className="metric-label">Valor atualizado</span>
            <span className="metric-value">{fmtBRL(totalCurrent)}</span>
            <span className="metric-delta up" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              <Icon name="trending" size={11} /> + {fmtBRL(totalGain)}
            </span>
          </div>
          <div className="divider" style={{ margin: "14px 0" }}></div>
          <div className="row between" style={{ fontSize: 12, color: "var(--text-dim)" }}>
            <span>Aportado</span>
            <span className="tabular" style={{ color: "var(--text)" }}>{fmtBRL(totalInvested)}</span>
          </div>
          <div className="row between" style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
            <span>Projetado no vencimento</span>
            <span className="tabular" style={{ color: "var(--primary-2)", fontWeight: 600 }}>{fmtBRL(totalAtMaturity)}</span>
          </div>
        </div>
      </div>

      {/* fluxo mensal grande */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ margin: 0 }}>Fluxo de caixa — últimos 6 meses</div>
          <div className="row" style={{ gap: 14, fontSize: 12 }}>
            <span className="row center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(180deg,#4ADE80,#16A34A)" }} /> Entradas</span>
            <span className="row center" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "linear-gradient(180deg,#F87171,#DC2626)" }} /> Saídas</span>
          </div>
        </div>
        <div className="bar-chart">
          {flowMonths.map((f) =>
          <div className="bar-col" key={f.label}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, width: "100%", height: 140 }}>
                <div style={{ flex: 1, background: "linear-gradient(180deg, #4ADE80, #16A34A)", borderRadius: "4px 4px 0 0", height: f.credits / flowMax * 140 + "px", minHeight: 2 }} title={`Entradas: ${fmtBRL(f.credits)}`} />
                <div style={{ flex: 1, background: "linear-gradient(180deg, #F87171, #DC2626)", borderRadius: "4px 4px 0 0", height: f.debits / flowMax * 140 + "px", minHeight: 2 }} title={`Saídas: ${fmtBRL(f.debits)}`} />
              </div>
              <div className="lbl">{f.label}</div>
              <div className="val" style={{ color: f.net >= 0 ? "var(--success)" : "var(--danger)" }}>
                {f.net >= 0 ? "+" : "−"}{fmtBRLCompact(Math.abs(f.net)).replace("R$ ", "")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>);

}

Object.assign(window, { Dashboard });