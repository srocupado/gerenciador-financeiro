// ===== Configurações =====

function Config({ state, setState, cloud: cloudCtl, theme, setTheme, palette, setPalette }) {
  const palettes = [
    { id: "purple", name: "Roxo Premium", c1: "#7C3AED", c2: "#C026D3" },
    { id: "blue", name: "Azul Corporativo", c1: "#2563EB", c2: "#38BDF8" },
    { id: "green", name: "Verde Financeiro", c1: "#16A34A", c2: "#FACC15" },
    { id: "amber", name: "Âmbar / Cobre", c1: "#D97706", c2: "#F472B6" },
    { id: "slate", name: "Grafite Minimal", c1: "#27272A", c2: "#38BDF8" },
  ];
  const [s, setS] = useState(state.settings);
  useEffect(() => setS(state.settings), [state.settings]);

  const apply = () => {
    setState({ ...state, settings: { ...s,
      cardClosingDay: parseInt(s.cardClosingDay) || 28,
      cardDueDay: parseInt(s.cardDueDay) || 5,
      cardLimit: parseFloat(s.cardLimit) || 0,
      birthYear: parseInt(s.birthYear) || 1985,
      retireAge: parseInt(s.retireAge) || 60,
      retireMonthlyTarget: parseFloat(s.retireMonthlyTarget) || 0,
    } });
    alert("Configurações salvas.");
  };

  const reset = () => {
    if (!confirm("Apagar TODOS os dados e recarregar com dados de exemplo?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Configurações</div>
          <div className="page-subtitle">Parâmetros do cartão e da aposentadoria</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ margin: 0 }}>Cartão de crédito</div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Limite total</label>
              <input className="input" type="number" value={s.cardLimit} onChange={(e) => setS({ ...s, cardLimit: e.target.value })}/>
            </div>
            <div className="field">
              <label>Dia de fechamento</label>
              <input className="input" type="number" min="1" max="31" value={s.cardClosingDay} onChange={(e) => setS({ ...s, cardClosingDay: e.target.value })}/>
            </div>
            <div className="field">
              <label>Dia de vencimento</label>
              <input className="input" type="number" min="1" max="31" value={s.cardDueDay} onChange={(e) => setS({ ...s, cardDueDay: e.target.value })}/>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ margin: 0 }}>Aposentadoria</div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label>Ano de nascimento</label>
              <input className="input" type="number" value={s.birthYear} onChange={(e) => setS({ ...s, birthYear: e.target.value })}/>
            </div>
            <div className="field">
              <label>Idade alvo de aposentadoria</label>
              <input className="input" type="number" value={s.retireAge} onChange={(e) => setS({ ...s, retireAge: e.target.value })}/>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Renda mensal desejada (R$)</label>
              <input className="input" type="number" value={s.retireMonthlyTarget} onChange={(e) => setS({ ...s, retireMonthlyTarget: e.target.value })}/>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 18, justifyContent: "space-between" }}>
        <button className="btn danger" onClick={reset}><Icon name="trash" size={14}/> Resetar com dados de exemplo</button>
        <button className="btn primary" onClick={apply}><Icon name="check" size={14}/> Salvar configurações</button>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">Aparência</div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Tema</label>
          <div className="theme-toggle" style={{ marginTop: 4 }}>
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
              <Icon name="sun" size={14}/> Claro
            </button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
              <Icon name="moon" size={14}/> Escuro
            </button>
          </div>
        </div>
        <div className="field">
          <label>Paleta de cores</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 4 }}>
            {palettes.map((p) => (
              <button key={p.id} onClick={() => setPalette(p.id)} title={p.name}
                style={{
                  height: 40, borderRadius: 10,
                  border: palette === p.id ? "2px solid var(--text)" : "1px solid var(--border)",
                  padding: 0, cursor: "pointer",
                  background: `linear-gradient(135deg, ${p.c1} 0%, ${p.c2} 100%)`,
                }}/>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>
            {palettes.find(p => p.id === palette)?.name}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">Sincronização na nuvem (Firebase)</div>
        {cloudCtl?.cloudUser ? (
          <div>
            <div className="row between" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13 }}>Conectado como <strong>{cloudCtl.cloudUser.email}</strong></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {cloudCtl.cloudMode ? "Sincronização ativa — mudanças aparecem em tempo real em todos os dispositivos." : "Login feito, mas sincronização está desligada."}
                </div>
              </div>
              <button className="btn ghost sm" onClick={() => cloud.signOut()}>Sair</button>
            </div>
            <label className="row" style={{ gap: 10, cursor: "pointer", padding: "8px 0" }}>
              <input type="checkbox" checked={cloudCtl.cloudMode} onChange={(e) => cloudCtl.setCloudMode(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Sincronizar automaticamente via Firebase</span>
            </label>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-muted)", marginBottom: 12 }}>
              Entre com sua conta Google para sincronizar os dados entre desktop e celular em tempo real. Seus dados ficam num documento privado no Firestore (só você acessa).
            </div>
            <button className="btn primary" onClick={() => cloud.signIn()}>Entrar com Google</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">Como funciona o armazenamento</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
          • Todos os dados ficam no <strong>navegador</strong> (localStorage) — não há servidor nem banco de dados.<br/>
          • Use <strong>"Salvar em arquivo…"</strong> na barra lateral (Chrome/Edge) para escolher um arquivo .json no seu computador. Cada alteração é gravada automaticamente nele.<br/>
          • Em outros navegadores, use <strong>Exportar JSON</strong> e <strong>Importar JSON</strong> manualmente.<br/>
          • Para começar do zero, clique em "Resetar com dados de exemplo".
        </div>
      </div>
    </div>
  );
}

function App() {
  const [state, setStateRaw] = useState(() => loadState());
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(state.settings.theme || "dark");
  const [palette, setPalette] = useState(state.settings.palette || "purple");
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudMode, setCloudMode] = useState(() => cloud.getStorageMode() === "cloud");

  const setState = (newState) => {
    setStateRaw(newState);
    saveState(newState);
    if (cloudMode && cloudUser) {
      cloud.save(newState);
    }
  };

  // auth listener
  useEffect(() => {
    return cloud.onAuth(async (user) => {
      setCloudUser(user);
      if (user && cloudMode) {
        const remote = await cloud.load();
        if (remote) {
          setStateRaw(remote);
          saveState(remote);
        } else {
          // Primeira vez na nuvem: sobe o estado local atual
          cloud.save(state);
        }
      }
    });
  }, [cloudMode]);

  // realtime subscription
  useEffect(() => {
    if (!cloudMode || !cloudUser) return;
    const unsub = cloud.subscribe((remote) => {
      setStateRaw(remote);
      saveState(remote);
    });
    return () => unsub && unsub();
  }, [cloudMode, cloudUser]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-palette", palette);
    if (state.settings.theme !== theme || state.settings.palette !== palette) {
      const next = { ...state, settings: { ...state.settings, theme, palette } };
      setStateRaw(next);
      saveState(next);
    }
  }, [theme, palette]);

  const cloudControls = { cloudUser, cloudMode, setCloudMode: (v) => { cloud.setStorageMode(v ? "cloud" : "local"); setCloudMode(v); } };

  let content;
  switch (page) {
    case "cartao": content = <Cartao state={state} setState={setState}/>; break;
    case "banco": content = <Banco state={state} setState={setState}/>; break;
    case "tesouro": content = <Investimentos state={state} setState={setState}/>; break;
    case "config": content = <Config state={state} setState={setState} cloud={cloudControls} theme={theme} setTheme={setTheme} palette={palette} setPalette={setPalette}/>; break;
    default: content = <Dashboard state={state} setPage={setPage}/>;
  }

  return (
    <React.Fragment>
      <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme}
        palette={palette} setPalette={setPalette} state={state} setState={setState}/>
      <main className="main">{content}</main>
      <MobileNav page={page} setPage={setPage}/>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
