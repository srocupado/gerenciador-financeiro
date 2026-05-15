# Gerenciador Financeiro

App pessoal de controle financeiro em React (sem build, sem backend), focado em três módulos: **Cartão de crédito**, **Banco** e **Investimentos / Aposentadoria**. Dados ficam no `localStorage` por padrão, com sincronização opcional via Firebase entre dispositivos.

## Como rodar

Não precisa de Node, npm nem build. Basta servir os arquivos estáticos:

```bash
# qualquer servidor estático serve
python3 -m http.server 8000
# ou
npx serve .
```

Acesse `http://localhost:8000`. Em produção pode ser hospedado direto no GitHub Pages, Netlify, Vercel ou qualquer CDN estática.

> **Observação sobre cache**: o `index.html` tem um *cache buster* manual em `window._V` (ex.: `"20260511k"`). Bump esse valor a cada deploy para forçar o navegador a baixar os JSX novos.

## Funcionalidades

### Dashboard
- Saldo bancário atual em destaque, com investimentos e patrimônio total como secundários.
- Entradas, saídas e resultado líquido do mês corrente.
- Mini gráfico de barras dos últimos 6 meses + chart maior abaixo.
- Cards de atalho para Cartão, Banco e Aposentadoria.

### Cartão de crédito
- Lançamentos à-vista e parcelados (`installments`/`currentInstallment`).
- Fatura por mês com gastos por categoria, navegação entre meses e indicador de limite usado.
- **Filtro de categoria** na tabela de lançamentos do mês.
- **Próximas faturas** colapsáveis: clica em qualquer mês futuro pra ver os itens que compõem o total.
- Tabela de compras parceladas ativas com progresso e parcelas restantes.

### Banco / Saldo
- Crédito e débito com flags `isCardPayment` (pagamento de fatura) e `isInvestment` (aporte).
- Histórico filtrado por mês com saldo acumulado (running balance).
- Saldo projetado pós-pagamento da próxima fatura.
- Mini chart de fluxo dos últimos 6 meses.

### Investimentos / Aposentadoria (Tesouro Direto IPCA+)
- **Taxa por aporte**: cada compra carrega sua própria `rate` (taxa real contratada), refletindo a variação diária do yield da NTN-B. O valor atual de cada lote é projetado pela taxa específica daquela compra.
- Chip "IPCA + X%" no card mostra a taxa efetiva (média ponderada por valor atual).
- **Badge vermelho** "N sem taxa" sinaliza aportes antigos sem `rate` definida; basta clicar no lápis pra ajustar.
- **Expansão inline** em cada título: chevron revela tabela embutida com data, valor, taxa e valor atual de cada aporte.
- Simulador de aposentadoria com renda perpétua líquida de IR (15%), preservando capital real.

### Categorias
- 9 categorias padrão (alimentação, transporte, moradia, saúde, lazer, educação, compras, serviços, outros).
- **Categorias customizadas** criadas inline no formulário de lançamento, com cor escolhida pelo usuário. Persistidas em `state.customCategories`.

### Transações recorrentes
- Marca um lançamento (novo ou existente) como **"Repetir mensalmente"** no próprio formulário do Cartão ou do Banco.
- O app gera as ocorrências mensais até o mês corrente, com `id` determinístico (`${sourceId}__${YYYY-MM}`) — multi-device idempotente.
- Funciona com parceladas no cartão (cada mês inicia uma nova série).
- Chip "↻ recorrente" identifica fontes e cópias.
- Deletar uma cópia registra o mês em `recurringExcludedMonths` da fonte; deletar a fonte para a geração futura.

### Modo privacidade
- FAB no canto superior direito mascara todos os valores monetários por `R$ •••••`.
- Persistido em `state.settings.privacyMode` (sobrevive refresh, sincroniza entre dispositivos).
- Forms continuam mostrando os valores pra permitir edição.

### Sincronização e armazenamento
- **localStorage** (padrão): chave `gerenciador_financeiro_v2`, JSON único.
- **Firebase Firestore** (opcional): login com Google em Configurações → state vive em `users/{uid}` com sync em tempo real entre dispositivos.
- **Arquivo local** (Chrome/Edge via File System Access API): "Salvar em arquivo" na sidebar grava num `.json` local que é atualizado a cada mudança.
- **Importar/Exportar JSON** disponível em qualquer navegador.

## Arquitetura

Sem bundler. `index.html` carrega React 18, Babel standalone, Firebase compat SDK e os JSX via CDN com cache busting manual. Componentes compartilham escopo global via `Object.assign(window, ...)` — `useState`, `useEffect`, `useRef` são desestruturados de `React` em `sidebar.jsx`.

```
src/
  store.jsx         estado, persistência, formatadores, cálculos (cartão, banco, tesouro), recorrência, modo privacidade
  cloud.jsx         Firebase Auth + Firestore (idempotente, debounced)
  categories.jsx    seletor de categoria com criação inline
  sidebar.jsx       navegação, ícones SVG, file sync, mobile nav
  dashboard.jsx     visão geral consolidada
  cartao.jsx        fatura, parcelamentos, filtro, próximas faturas expansíveis
  banco.jsx         saldo, fluxo, histórico mensal
  tesouro.jsx       Tesouro IPCA+ com taxa por aporte e simulador de aposentadoria
  investimentos.jsx wrapper com tabs (renderiza Tesouro na aba "aposentadoria")
  app.jsx           App root, roteamento por useState, Config, FAB de privacidade
```

### Schema do estado

```js
{
  settings: {
    theme, palette, privacyMode,
    cardClosingDay, cardDueDay, cardLimit,
    birthYear, retireAge, retireMonthlyTarget,
  },
  customCategories: [{ id, name, color }],
  bankTransactions: [{
    id, date, desc, category, type, amount,
    isCardPayment?, isInvestment?,
    recurring?, recurringEndMonth?, recurringExcludedMonths?, recurringFrom?,
  }],
  cardEntries: [{
    id, date, desc, category, amount, installments, currentInstallment,
    recurring?, recurringEndMonth?, recurringExcludedMonths?, recurringFrom?,
  }],
  treasuryHoldings: [{
    id, name, maturity, rate, ipcaAssumption,
    contributions: [{ id, date, amount, rate? }],
  }],
}
```

Schema é aditivo: campos novos (recorrência, taxa por aporte, modo privacidade) são opcionais. States antigos continuam válidos sem migração.

## Notas

- **Pré-requisito do navegador**: Web APIs modernas (Intl, fetch, ES modules-ish via Babel transform). Chrome/Edge/Safari recentes funcionam plenamente. File System Access API é exclusiva de Chromium.
- **Firebase**: chave de API exposta no client (esperado em apps web). A segurança real fica nas rules do Firestore — escopo restrito a `users/{uid}` do próprio usuário autenticado.
- **Sem testes automatizados**: validação manual conforme as features evoluem.
