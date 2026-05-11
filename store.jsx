// ===== Sidebar de navegação + tema + import/export =====
const { useState, useEffect, useRef } = React;

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home": return (<svg {...common}><path d="M3 12L12 4l9 8"/><path d="M5 10v10h14V10"/></svg>);
    case "card": return (<svg {...common}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 11h20"/></svg>);
    case "bank": return (<svg {...common}><path d="M3 10l9-6 9 6"/><path d="M5 10v8M19 10v8M9 10v8M15 10v8"/><path d="M3 21h18"/></svg>);
    case "treasury": return (<svg {...common}><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 100 7H14a3.5 3.5 0 010 7H6"/></svg>);
    case "sun": return (<svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>);
    case "moon": return (<svg {...common}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>);
    case "download": return (<svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>);
    case "upload": return (<svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>);
    case "save": return (<svg {...common}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>);
    case "plus": return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case "trash": return (<svg {...common}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>);
    case "edit": return (<svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4z"/></svg>);
    case "calendar": return (<svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    case "trending": return (<svg {...common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>);
    case "target": return (<svg {...common}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
    case "chevron": return (<svg {...common}><polyline points="9 18 15 12 9 6"/></svg>);
    case "x": return (<svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>);
    case "check": return (<svg {...common}><polyline points="20 6 9 17 4 12"/></svg>);
    case "settings": return (<svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
    default: return null;
  }
}

function FileSyncControls({ state, setState }) {
  // File System Access API — quando disponível, permite "salvar em arquivo" persistente
  const [fileHandle, setFileHandle] = useState(null);
  const [fileName, setFileName] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const inputRef = useRef(null);
  const fsaSupported = typeof window !== "undefined" && "showSaveFilePicker" in window;

  // Auto-salvar no fileHandle quando state muda
  useEffect(() => {
    if (!fileHandle) return;
    let cancelled = false;
    (async () => {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(state, null, 2));
        await writable.close();
        if (!cancelled) setSavedAt(new Date());
      } catch (e) { /* arquivo pode ter sido revogado */ }
    })();
    return () => { cancelled = true; };
  }, [state, fileHandle]);

  async function pickSaveFile() {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "financas.json",
        types: [{ description: "Dados financeiros", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      setFileHandle(handle);
      setFileName(handle.name);
      setSavedAt(new Date());
    } catch (e) { /* user cancel */ }
  }

  async function pickOpenFile() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "Dados financeiros", accept: { "application/json": [".json"] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      setState(parsed);
      setFileHandle(handle);
      setFileName(handle.name);
      setSavedAt(new Date());
    } catch (e) { alert("Não foi possível abrir o arquivo."); }
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function uploadJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setState(parsed);
        alert("Dados importados com sucesso.");
      } catch { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 4px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-dim)", fontWeight: 600, padding: "0 8px 4px" }}>
        Arquivo local
      </div>
      {fsaSupported && (
        <button className="btn ghost sm" onClick={fileHandle ? null : pickSaveFile}
          style={{ justifyContent: "flex-start", opacity: fileHandle ? 1 : 1 }}
          title={fileHandle ? `Salvando em ${fileName}` : "Escolha um arquivo .json para salvar continuamente"}>
          <Icon name="save" size={14} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileHandle ? `Auto-salvando: ${fileName}` : "Salvar em arquivo…"}
          </span>
        </button>
      )}
      {fsaSupported && (
        <button className="btn ghost sm" onClick={pickOpenFile} style={{ justifyContent: "flex-start" }}>
          <Icon name="upload" size={14} />
          Abrir arquivo…
        </button>
      )}
      <button className="btn ghost sm" onClick={downloadJSON} style={{ justifyContent: "flex-start" }}>
        <Icon name="download" size={14} />
        Exportar JSON
      </button>
      <button className="btn ghost sm" onClick={() => inputRef.current?.click()} style={{ justifyContent: "flex-start" }}>
        <Icon name="upload" size={14} />
        Importar JSON
      </button>
      <input ref={inputRef} type="file" accept="application/json" onChange={uploadJSON} style={{ display: "none" }} />
      {savedAt && fileHandle && (
        <div style={{ fontSize: 10, color: "var(--success)", padding: "4px 8px" }}>
          ✓ Salvo {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ page, setPage, theme, setTheme, palette, setPalette, state, setState }) {
  const items = [
    { id: "dashboard", label: "Visão Geral", icon: "home" },
    { id: "cartao", label: "Cartão de Crédito", icon: "card" },
    { id: "banco", label: "Saldo em Banco", icon: "bank" },
    { id: "tesouro", label: "Aposentadoria", icon: "treasury" },
    { id: "config", label: "Configurações", icon: "settings" },
  ];

  const palettes = [
    { id: "purple", name: "Roxo Premium", c1: "#7C3AED", c2: "#C026D3" },
    { id: "blue", name: "Azul Corporativo", c1: "#2563EB", c2: "#38BDF8" },
    { id: "green", name: "Verde Financeiro", c1: "#16A34A", c2: "#FACC15" },
    { id: "amber", name: "Âmbar / Cobre", c1: "#D97706", c2: "#F472B6" },
    { id: "slate", name: "Grafite Minimal", c1: "#27272A", c2: "#38BDF8" },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">₣</div>
        <div>
          <div className="brand-name">Finanças</div>
          <div className="brand-sub">Gestão pessoal</div>
        </div>
      </div>

      <div className="nav-group-title">Módulos</div>
      {items.map((it) => (
        <div key={it.id} className={"nav-item" + (page === it.id ? " active" : "")} onClick={() => setPage(it.id)}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
        </div>
      ))}

      <FileSyncControls state={state} setState={setState} />

      <div className="nav-group-title" style={{ paddingTop: 0 }}>Paleta</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, padding: "0 4px 8px" }}>
        {palettes.map((p) => (
          <button key={p.id}
            onClick={() => setPalette(p.id)}
            title={p.name}
            style={{
              height: 28,
              borderRadius: 8,
              border: palette === p.id ? "2px solid var(--text)" : "1px solid var(--border)",
              padding: 0,
              cursor: "pointer",
              background: `linear-gradient(135deg, ${p.c1} 0%, ${p.c2} 100%)`,
              boxShadow: palette === p.id ? "0 0 0 2px var(--bg-1)" : "none",
            }}/>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 8px 8px", textAlign: "center" }}>
        {palettes.find(p => p.id === palette)?.name}
      </div>

      <div className="theme-toggle">
        <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
          <Icon name="sun" size={14} /> Claro
        </button>
        <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
          <Icon name="moon" size={14} /> Escuro
        </button>
      </div>
    </aside>
  );
}

// ===== Bottom nav for mobile (rendered alongside Sidebar) =====
function MobileNav({ page, setPage }) {
  const tabs = [
    { id: "dashboard", label: "Visão", icon: "home" },
    { id: "cartao", label: "Cartão", icon: "card" },
    { id: "banco", label: "Banco", icon: "bank" },
    { id: "tesouro", label: "Aposenta.", icon: "treasury" },
    { id: "config", label: "Ajustes", icon: "settings" },
  ];
  return (
    <nav className="mobile-nav">
      {tabs.map((t) => (
        <button key={t.id} className={"m-tab" + (page === t.id ? " active" : "")} onClick={() => setPage(t.id)}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

Object.assign(window, { Icon, Sidebar, MobileNav });
