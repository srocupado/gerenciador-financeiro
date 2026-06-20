// ===== Estado global, persistência e helpers =====

const STORAGE_KEY = "gerenciador_financeiro_v2";

// ---- modo privacidade (mascara valores monetários) ----
let _privacy = false;
const MONEY_MASK = "R$ •••••";
function setPrivacyMode(b) { _privacy = !!b; }
function getPrivacyMode() { return _privacy; }

// ---- formatadores ----
const fmtBRL = (n) => {
  if (_privacy) return MONEY_MASK;
  if (n === null || n === undefined || isNaN(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};
const fmtBRLCompact = (n) => {
  if (_privacy) return MONEY_MASK;
  if (Math.abs(n) >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (Math.abs(n) >= 1_000) return "R$ " + (n / 1_000).toFixed(1).replace(".", ",") + "k";
  return fmtBRL(n);
};
const fmtPct = (n, d = 2) => (n * 100).toFixed(d).replace(".", ",") + "%";
const fmtDate = (iso) => {
  const d = parseDate(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMonth = (iso) => {
  const d = iso instanceof Date ? iso : parseDate(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};
const monthKey = (date) => {
  const d = date instanceof Date ? date : parseDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

// Parse "YYYY-MM-DD" como data LOCAL (evita o bug de fuso UTC).
const parseDate = (iso) => {
  if (iso instanceof Date) return iso;
  if (typeof iso !== "string") return new Date(iso);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(iso);
  return new Date(y, m - 1, d);
};

// ---- categorias padrão ----
const DEFAULT_CATEGORIES = [
  { id: "alimentacao", name: "Alimentação", color: "#F472B6" },
  { id: "transporte", name: "Transporte", color: "#60A5FA" },
  { id: "moradia", name: "Moradia", color: "#A78BFA" },
  { id: "saude", name: "Saúde", color: "#4ADE80" },
  { id: "lazer", name: "Lazer", color: "#FBBF24" },
  { id: "educacao", name: "Educação", color: "#22D3EE" },
  { id: "compras", name: "Compras", color: "#F0ABFC" },
  { id: "servicos", name: "Serviços", color: "#FB923C" },
  { id: "outros", name: "Outros", color: "#94A3B8" },
];
// CATEGORIES é o registro vivo: defaults + customizadas pelo usuário.
// É mutado por syncCategories(state) sempre que o estado é carregado/atualizado.
let CATEGORIES = [...DEFAULT_CATEGORIES];
function syncCategories(state) {
  const customs = (state && Array.isArray(state.customCategories)) ? state.customCategories : [];
  // mantém a referência do array global estável para callers que possam tê-la cacheado
  CATEGORIES.length = 0;
  CATEGORIES.push(...DEFAULT_CATEGORIES, ...customs);
  return CATEGORIES;
}
const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.id === "outros") || CATEGORIES[CATEGORIES.length - 1];
// slug simples para gerar id de categoria nova a partir do nome
function slugCategory(name) {
  const base = (name || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return base || ("cat_" + Math.random().toString(36).slice(2, 7));
}

// ---- estado inicial / dados de exemplo ----
const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function seedData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const D = (yy, mm, dd) => toISO(new Date(yy, mm, dd));

  return {
    settings: {
      theme: "dark",
      privacyMode: false,
      cardClosingDay: 28,
      cardDueDay: 5,
      cardLimit: 12000,
      birthYear: 1985,
      retireAge: 60,
      retireMonthlyTarget: 8000, // renda mensal desejada
    },
    customCategories: [], // categorias criadas pelo usuário
    investments: { assets: [] }, // ações, FIIs, ETFs, RF, fundos, cripto
    hiddenClasses: [], // ids de classes recolhidas no dashboard
    bankTransactions: [
      { id: uid(), date: D(y, m, 1), desc: "Salário — empresa", category: "outros", amount: 12500, type: "credit" },
      { id: uid(), date: D(y, m, 3), desc: "Aluguel", category: "moradia", amount: -2800, type: "debit" },
      { id: uid(), date: D(y, m, 5), desc: "Pagamento fatura cartão (mês ant.)", category: "outros", amount: -3120, type: "debit", isCardPayment: true },
      { id: uid(), date: D(y, m, 8), desc: "Mercado", category: "alimentacao", amount: -680, type: "debit" },
      { id: uid(), date: D(y, m, 10), desc: "Aporte Tesouro IPCA+ 2045", category: "outros", amount: -1500, type: "debit", isInvestment: true },
      { id: uid(), date: D(y, m, 12), desc: "Conta de luz", category: "moradia", amount: -210, type: "debit" },
      { id: uid(), date: D(y, m, 15), desc: "Reembolso plano de saúde", category: "saude", amount: 340, type: "credit" },
      { id: uid(), date: new Date(y, m, Math.max(1, d - 2)).toISOString().slice(0, 10), desc: "Posto combustível", category: "transporte", amount: -290, type: "debit" },
    ],
    cardEntries: [
      // compra à vista
      { id: uid(), date: D(y, m, 2), desc: "Supermercado", category: "alimentacao", amount: 540, installments: 1, currentInstallment: 1 },
      // parcelada com várias parcelas restantes (4/10 neste mês)
      { id: uid(), date: D(y, m, 10), desc: "Notebook Dell", category: "compras", amount: 6200, installments: 10, currentInstallment: 4 },
      // 2/6 neste mês
      { id: uid(), date: D(y, m, 18), desc: "Curso online", category: "educacao", amount: 1800, installments: 6, currentInstallment: 2 },
      // recorrente mês atual
      { id: uid(), date: D(y, m, 6), desc: "Streaming + apps", category: "servicos", amount: 89.90, installments: 1, currentInstallment: 1 },
      { id: uid(), date: D(y, m, 9), desc: "Restaurante", category: "alimentacao", amount: 215, installments: 1, currentInstallment: 1 },
      { id: uid(), date: D(y, m, 11), desc: "Farmácia", category: "saude", amount: 178, installments: 1, currentInstallment: 1 },
      // 3/3 — última parcela neste mês
      { id: uid(), date: D(y, m, 20), desc: "Pneus", category: "transporte", amount: 2400, installments: 3, currentInstallment: 3 },
      // futura — começa este mês, 12x
      { id: uid(), date: new Date(y, m, Math.max(1, d - 1)).toISOString().slice(0, 10), desc: "Viagem família", category: "lazer", amount: 9600, installments: 12, currentInstallment: 1 },
    ],
    treasuryHoldings: [
      {
        id: uid(),
        name: "Tesouro IPCA+ 2035",
        maturity: "2035-05-15",
        rate: 0.0625, // spread real anual (acima do IPCA)
        ipcaAssumption: 0.04, // premissa de IPCA (configurável por título)
        contributions: [
          { id: uid(), date: D(y - 2, 3, 10), amount: 5000 },
          { id: uid(), date: D(y - 1, 6, 15), amount: 3000 },
          { id: uid(), date: D(y - 1, 11, 20), amount: 2500 },
          { id: uid(), date: D(y, 1, 10), amount: 4000 },
          { id: uid(), date: D(y, m, 10), amount: 1500 },
        ],
      },
      {
        id: uid(),
        name: "Tesouro IPCA+ 2045",
        maturity: "2045-05-15",
        rate: 0.0680,
        ipcaAssumption: 0.04,
        contributions: [
          { id: uid(), date: D(y - 1, 0, 5), amount: 8000 },
          { id: uid(), date: D(y - 1, 5, 12), amount: 4500 },
          { id: uid(), date: D(y, 2, 8), amount: 3000 },
        ],
      },
      {
        id: uid(),
        name: "Tesouro IPCA+ 2055",
        maturity: "2055-05-15",
        rate: 0.0710,
        ipcaAssumption: 0.04,
        contributions: [
          { id: uid(), date: D(y - 1, 8, 22), amount: 6000 },
          { id: uid(), date: D(y, 0, 18), amount: 2000 },
        ],
      },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      syncCategories(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.customCategories)) parsed.customCategories = [];
    syncCategories(parsed);
    return parsed;
  } catch (e) {
    console.warn("Falha ao ler estado, regenerando…", e);
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    syncCategories(seeded);
    return seeded;
  }
}
function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncCategories(state);
  } catch (e) {}
}

// ---- Cálculos: Cartão ----
// Para cada lançamento, gera as parcelas (uma por mês a partir da data).
// A data do lançamento (entry.date) representa o mês da parcela `currentInstallment`
// (1-indexed). Ou seja, se o usuário informa "9 de 10" em maio/2026, a parcela 9 cai
// em maio/2026, a 1ª caiu 8 meses antes e a 10ª cairá 1 mês depois.
//
// Fechamento do cartão: o dia em que a fatura FECHA. A partir desse dia (inclusive)
// as compras entram na PRÓXIMA fatura e a fatura aberta vira a do mês seguinte.
// Ex.: fechamento 20 → compras nos dias 20..fim-do-mês caem na fatura do mês seguinte.
let _cardClosingDay = 32; // default: sem shift (32 nunca é alcançado por getDate())
function setCardClosingDay(d) {
  const n = parseInt(d);
  _cardClosingDay = (isNaN(n) || n < 1 || n > 31) ? 32 : n;
}
function getCardClosingDay() { return _cardClosingDay; }
// Retorna { year, month } da fatura à qual a data pertence.
function billingMonthOf(dateLike, closingDay) {
  const d = (dateLike instanceof Date) ? dateLike : parseDate(dateLike);
  const cd = (typeof closingDay === "number" ? closingDay : _cardClosingDay) || 32;
  let y = d.getFullYear();
  let m = d.getMonth();
  if (d.getDate() >= cd) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return { year: y, month: m };
}
function getCardInstallmentForMonth(entry, year, month) {
  // retorna { value, installmentNum } se essa entrada possui parcela neste mês, senão null
  const bm = billingMonthOf(entry.date);
  const monthsSinceStart = (year - bm.year) * 12 + (month - bm.month);
  const currentInst = Math.max(1, parseInt(entry.currentInstallment) || 1);
  const installmentNum = monthsSinceStart + currentInst;
  if (installmentNum < 1) return null;
  if (installmentNum > entry.installments) return null;
  return {
    value: entry.amount / entry.installments,
    installmentNum,
    total: entry.installments,
  };
}

function getCardBillForMonth(entries, year, month) {
  const items = [];
  entries.forEach((e) => {
    const inst = getCardInstallmentForMonth(e, year, month);
    if (inst) {
      items.push({
        ...e,
        installmentValue: inst.value,
        installmentNum: inst.installmentNum,
        installmentTotal: inst.total,
      });
    }
  });
  const total = items.reduce((acc, it) => acc + it.installmentValue, 0);
  return { items, total };
}

// ---- Cálculos: Banco ----
function getBankBalance(transactions) {
  return transactions.reduce((acc, t) => acc + t.amount, 0);
}
function getMonthlyFlow(transactions, year, month) {
  let credits = 0, debits = 0;
  transactions.forEach((t) => {
    const d = parseDate(t.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      if (t.amount > 0) credits += t.amount;
      else debits += Math.abs(t.amount);
    }
  });
  return { credits, debits, net: credits - debits };
}

// ---- Cálculos: Tesouro ----
// Cada aporte pode ter sua própria `rate` (taxa real contratada na compra).
// Quando ausente, fallback pra `holding.rate` (taxa padrão do título).
function contributionRate(contrib, fallbackRate) {
  return (contrib && typeof contrib.rate === "number") ? contrib.rate : fallbackRate;
}
// Valor presente projetado: cada aporte rende (1+ipca)*(1+rate) - 1 ao ano até hoje.
function projectContributionToToday(contrib, rate, ipca) {
  const r = contributionRate(contrib, rate);
  const start = parseDate(contrib.date);
  // Compara com meia-noite local de hoje pra que aportes do mesmo dia não mostrem ganho fictício.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const years = (today - start) / (365.25 * 24 * 3600 * 1000);
  const annual = (1 + ipca) * (1 + r) - 1;
  return contrib.amount * Math.pow(1 + annual, Math.max(0, years));
}
function projectContributionToDate(contrib, rate, ipca, targetDate) {
  const r = contributionRate(contrib, rate);
  const start = parseDate(contrib.date);
  const tgt = parseDate(targetDate);
  const years = Math.max(0, (tgt - start) / (365.25 * 24 * 3600 * 1000));
  const annual = (1 + ipca) * (1 + r) - 1;
  return contrib.amount * Math.pow(1 + annual, years);
}
function holdingCurrentValue(h) {
  return h.contributions.reduce((acc, c) => acc + projectContributionToToday(c, h.rate, h.ipcaAssumption), 0);
}
function holdingTotalContributed(h) {
  return h.contributions.reduce((acc, c) => acc + c.amount, 0);
}
function holdingValueAtMaturity(h) {
  return h.contributions.reduce((acc, c) => acc + projectContributionToDate(c, h.rate, h.ipcaAssumption, h.maturity), 0);
}
// Taxa efetiva do título: média ponderada por valor atual de cada aporte.
function holdingEffectiveRate(h) {
  if (!h || !Array.isArray(h.contributions) || h.contributions.length === 0) return h?.rate || 0;
  let totalWeight = 0, weightedSum = 0;
  h.contributions.forEach((c) => {
    const value = projectContributionToToday(c, h.rate, h.ipcaAssumption);
    const r = contributionRate(c, h.rate);
    totalWeight += value;
    weightedSum += value * r;
  });
  return totalWeight > 0 ? weightedSum / totalWeight : (h.rate || 0);
}
// Conta aportes sem taxa contratada definida (usados pra exibir aviso na UI).
function holdingMissingRateCount(h) {
  if (!h || !Array.isArray(h.contributions)) return 0;
  return h.contributions.filter((c) => typeof c.rate !== "number").length;
}

// ---- Recorrência ----
function clampDayOfMonth(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate();
  return Math.min(day, last);
}
function ymToParts(ym) {
  const [y, m] = ym.split("-").map(Number);
  return { y, m: m - 1 };
}
function partsToYM(y, m) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}
function nextMonth(ym) {
  const { y, m } = ymToParts(ym);
  const d = new Date(y, m + 1, 1);
  return partsToYM(d.getFullYear(), d.getMonth());
}
function monthsBetween(startYM, endYM) {
  const out = [];
  if (!startYM || !endYM || startYM > endYM) return out;
  let cur = startYM;
  while (cur <= endYM) {
    out.push(cur);
    cur = nextMonth(cur);
  }
  return out;
}
function recurringInstanceId(sourceId, ym) {
  return `${sourceId}__${ym}`;
}
// Materializa cópias mensais a partir das fontes (entries com recurring: true)
// até o mês corrente. Idempotente: ids determinísticos garantem que regerar
// não duplica entradas.
function advanceRecurring(state) {
  if (!state) return state;
  const todayYM = monthKey(new Date());

  const generate = (arr) => {
    if (!Array.isArray(arr)) return arr;
    const existingIds = new Set(arr.map((e) => e.id));
    const sources = arr.filter((e) => e.recurring === true && !e.recurringFrom);
    const additions = [];
    sources.forEach((src) => {
      const srcDate = parseDate(src.date);
      const srcYM = monthKey(srcDate);
      const endYM = src.recurringEndMonth || todayYM;
      const excluded = new Set(Array.isArray(src.recurringExcludedMonths) ? src.recurringExcludedMonths : []);
      const startYM = nextMonth(srcYM);
      const months = monthsBetween(startYM, endYM);
      months.forEach((ym) => {
        if (excluded.has(ym)) return;
        const copyId = recurringInstanceId(src.id, ym);
        if (existingIds.has(copyId)) return;
        const { y, m } = ymToParts(ym);
        const day = clampDayOfMonth(y, m, srcDate.getDate());
        const newDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const copy = { ...src, id: copyId, date: newDate, recurringFrom: src.id };
        delete copy.recurring;
        delete copy.recurringEndMonth;
        delete copy.recurringExcludedMonths;
        if ("currentInstallment" in copy) copy.currentInstallment = 1;
        additions.push(copy);
        existingIds.add(copyId);
      });
    });
    return additions.length ? arr.concat(additions) : arr;
  };

  const newBank = generate(state.bankTransactions);
  const newCard = generate(state.cardEntries);
  if (newBank === state.bankTransactions && newCard === state.cardEntries) return state;
  return { ...state, bankTransactions: newBank, cardEntries: newCard };
}

// expor globalmente para outros scripts babel
Object.assign(window, {
  STORAGE_KEY, fmtBRL, fmtBRLCompact, fmtPct, fmtDate, fmtMonth, monthKey, todayISO, uid, parseDate,
  CATEGORIES, DEFAULT_CATEGORIES, categoryById, syncCategories, slugCategory,
  loadState, saveState, seedData,
  getCardInstallmentForMonth, getCardBillForMonth,
  setCardClosingDay, getCardClosingDay, billingMonthOf,
  getBankBalance, getMonthlyFlow,
  projectContributionToToday, projectContributionToDate, contributionRate,
  holdingCurrentValue, holdingTotalContributed, holdingValueAtMaturity,
  holdingEffectiveRate, holdingMissingRateCount,
  clampDayOfMonth, nextMonth, monthsBetween, recurringInstanceId, advanceRecurring,
  setPrivacyMode, getPrivacyMode, MONEY_MASK,
});
