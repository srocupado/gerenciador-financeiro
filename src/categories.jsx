// ===== Categorias: seletor com criação inline =====
//
// CategorySelect renderiza um <select> de categorias e expõe uma opção
// "+ Nova categoria…" que abre um painel inline para o usuário criar uma
// categoria personalizada (nome + cor). A nova categoria é persistida em
// state.customCategories e selecionada automaticamente.

const { useState: useStateCat, useRef: useRefCat, useEffect: useEffectCat } = React;

// paleta de cores sugeridas para novas categorias
const CATEGORY_COLOR_PRESETS = [
  "#F472B6", "#60A5FA", "#A78BFA", "#4ADE80",
  "#FBBF24", "#22D3EE", "#F0ABFC", "#FB923C",
  "#F87171", "#34D399", "#818CF8", "#FACC15",
];

function CategorySelect({ state, setState, value, onChange }) {
  const [creating, setCreating] = useStateCat(false);
  const [newName, setNewName] = useStateCat("");
  const [newColor, setNewColor] = useStateCat(CATEGORY_COLOR_PRESETS[0]);
  const nameRef = useRefCat(null);

  useEffectCat(() => {
    if (creating && nameRef.current) nameRef.current.focus();
  }, [creating]);

  const openCreate = () => {
    setNewName("");
    setNewColor(CATEGORY_COLOR_PRESETS[Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)]);
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName("");
  };

  const confirmCreate = () => {
    const name = (newName || "").trim();
    if (!name) {
      if (nameRef.current) nameRef.current.focus();
      return;
    }
    // gera id único — se já existe, sufixa um número
    const customs = Array.isArray(state.customCategories) ? state.customCategories : [];
    const taken = new Set([...CATEGORIES.map((c) => c.id)]);
    let base = slugCategory(name);
    let id = base;
    let n = 2;
    while (taken.has(id)) {
      id = base + "_" + n++;
    }
    const newCat = { id, name, color: newColor };
    const nextCustoms = [...customs, newCat];
    // já sincroniza o registro global antes do re-render para que categoryById funcione
    syncCategories({ ...state, customCategories: nextCustoms });
    setState({ ...state, customCategories: nextCustoms });
    onChange(id);
    setCreating(false);
    setNewName("");
  };

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === "__new__") {
      openCreate();
      // reseta o select para o valor anterior pra não ficar "preso" na opção __new__
      e.target.value = value || "";
      return;
    }
    onChange(v);
  };

  // garante que CATEGORIES está sincronizado (caso este componente renderize
  // antes do loadState ter rodado em algum ponto raro)
  if (Array.isArray(state.customCategories)) {
    // sincroniza apenas se o tamanho diferir — evita re-mutar a cada render
    if (CATEGORIES.length !== DEFAULT_CATEGORIES.length + state.customCategories.length) {
      syncCategories(state);
    }
  }

  return (
    <div>
      <select className="select" value={value || ""} onChange={handleSelect}>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
        <option disabled>──────────</option>
        <option value="__new__">+ Nova categoria…</option>
      </select>

      {creating && (
        <div style={{
          marginTop: 10,
          padding: 12,
          border: "1px dashed var(--border)",
          borderRadius: 10,
          background: "var(--surface-2, rgba(255,255,255,0.02))",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Nova categoria
          </div>
          <input
            ref={nameRef}
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Pets, Assinaturas, Presentes…"
            maxLength={32}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); confirmCreate(); }
              if (e.key === "Escape") { e.preventDefault(); cancelCreate(); }
            }}
          />
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Cor</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORY_COLOR_PRESETS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewColor(col)}
                  title={col}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: col,
                    border: newColor === col ? "2px solid var(--text)" : "2px solid transparent",
                    boxShadow: newColor === col ? "0 0 0 1px var(--border) inset" : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost sm" onClick={cancelCreate}>Cancelar</button>
            <button type="button" className="btn primary sm" onClick={confirmCreate}>
              Criar e selecionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// expõe globalmente para os outros scripts babel
Object.assign(window, { CategorySelect, CATEGORY_COLOR_PRESETS });
