// ===== Estado global, persistência e helpers =====

const STORAGE_KEY = "gerenciador_financeiro_v1";

// ---- formatadores ----
const fmtBRL = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};
const fmtBRLCompact = (n) => {
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
const CATEGORIES = [
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
const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

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
      cardClosingDay: 28,
      cardDueDay: 5,
      cardLimit: 12000,
      birthYear: 1985,
      retireAge: 60,
      retireMonthlyTarget: 8000, // renda mensal desejada
    },
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
      // parcelada com várias parcelas restantes (começou 3 meses atrás, 10x)
      { id: uid(), date: D(y, m - 3, 10), desc: "Notebook Dell", category: "compras", amount: 6200, installments: 10, currentInstallment: 4 },
      // 2/6
      { id: uid(), date: D(y, m - 1, 18), desc: "Curso online", category: "educacao", amount: 1800, installments: 6, currentInstallment: 2 },
      // recorrente mês atual
      { id: uid(), date: D(y, m, 6), desc: "Streaming + apps", category: "servicos", amount: 89.90, installments: 1, currentInstallment: 1 },
      { id: uid(), date: D(y, m, 9), desc: "Restaurante", category: "alimentacao", amount: 215, installments: 1, currentInstallment: 1 },
      { id: uid(), date: D(y, m, 11), desc: "Farmácia", category: "saude", amount: 178, installments: 1, currentInstallment: 1 },
      // 3/3 — última parcela
      { id: uid(), date: D(y, m - 2, 20), desc: "Pneus", category: "transporte", amount: 2400, installments: 3, currentInstallment: 3 },
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
      return seeded;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler estado, regenerando…", e);
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ---- Cálculos: Cartão ----
// Para cada lançamento, gera as parcelas (uma por mês a partir da data).
// currentInstallment indica em qual parcela estamos AGORA (1-indexed).
function getCardInstallmentForMonth(entry, year, month) {
  // retorna { value, installmentNum } se essa entrada possui parcela neste mês, senão null
  const start = parseDate(entry.date);
  const startY = start.getFullYear();
  const startM = start.getMonth();
  const monthsSinceStart = (year - startY) * 12 + (month - startM);
  if (monthsSinceStart < 0) return null;
  if (monthsSinceStart >= entry.installments) return null;
  return {
    value: entry.amount / entry.installments,
    installmentNum: monthsSinceStart + 1,
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
// Valor presente projetado: cada aporte rende (1+ipca)*(1+rate) - 1 ao ano até hoje.
function projectContributionToToday(contrib, rate, ipca) {
  const start = parseDate(contrib.date);
  const now = new Date();
  const years = (now - start) / (365.25 * 24 * 3600 * 1000);
  const annual = (1 + ipca) * (1 + rate) - 1;
  return contrib.amount * Math.pow(1 + annual, Math.max(0, years));
}
function projectContributionToDate(contrib, rate, ipca, targetDate) {
  const start = parseDate(contrib.date);
  const tgt = parseDate(targetDate);
  const years = Math.max(0, (tgt - start) / (365.25 * 24 * 3600 * 1000));
  const annual = (1 + ipca) * (1 + rate) - 1;
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

// expor globalmente para outros scripts babel
Object.assign(window, {
  STORAGE_KEY, fmtBRL, fmtBRLCompact, fmtPct, fmtDate, fmtMonth, monthKey, todayISO, uid, parseDate,
  CATEGORIES, categoryById,
  loadState, saveState, seedData,
  getCardInstallmentForMonth, getCardBillForMonth,
  getBankBalance, getMonthlyFlow,
  projectContributionToToday, projectContributionToDate,
  holdingCurrentValue, holdingTotalContributed, holdingValueAtMaturity,
});
