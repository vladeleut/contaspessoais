const STORAGE_KEY = 'contas-pessoais';

const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG || {};
const supabaseClient = supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

const state = {
  selectedMonth: getCurrentMonthKey(),
  activeSheetTab: 'cards',
  activeCardId: null,
  entries: [],
  fixedExpenses: [],
  fixedPayments: [],
  creditCards: [],
  accounts: [],
  reserves: [],
  budgetMonths: [],
  salaryConfirmations: [],
  topups: [],
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const els = {
  authScreen: document.getElementById('authScreen'),
  appScreen: document.getElementById('appScreen'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authMessage: document.getElementById('authMessage'),
  signUpBtn: document.getElementById('signUpBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsPanel: document.getElementById('settingsPanel'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  cardSettingsForm: document.getElementById('cardSettingsForm'),
  accountSettingsForm: document.getElementById('accountSettingsForm'),
  reserveSettingsForm: document.getElementById('reserveSettingsForm'),
  budgetMonthForm: document.getElementById('budgetMonthForm'),
  creditCardsList: document.getElementById('creditCardsList'),
  accountsList: document.getElementById('accountsList'),
  reservesList: document.getElementById('reservesList'),
  budgetMonthsList: document.getElementById('budgetMonthsList'),
  budgetMonthStart: document.getElementById('budgetMonthStart'),
  budgetMonthOpeningBalance: document.getElementById('budgetMonthOpeningBalance'),
  monthSelector: document.getElementById('monthSelector'),
  sheetTabs: document.getElementById('sheetTabs'),
  salary15Form: document.getElementById('salary15Form'),
  salary30Form: document.getElementById('salary30Form'),
  salary15Expected: document.getElementById('salary15Expected'),
  salary30Expected: document.getElementById('salary30Expected'),
  salary15Amount: document.getElementById('salary15Amount'),
  salary30Amount: document.getElementById('salary30Amount'),
  topupForm: document.getElementById('topupForm'),
  receitaTotal: document.getElementById('receitaTotal'),
  despesaTotal: document.getElementById('despesaTotal'),
  saldoTotal: document.getElementById('saldoTotal'),
  cartaoTotal: document.getElementById('cartaoTotal'),
  monthIncome: document.getElementById('monthIncome'),
  monthExpense: document.getElementById('monthExpense'),
  monthBalance: document.getElementById('monthBalance'),
  transactionsList: document.getElementById('transactionsList'),
  fixedExpensesList: document.getElementById('fixedExpensesList'),
  movementForm: document.getElementById('movementForm'),
  movementCardId: document.getElementById('movementCardId'),
  fixedExpenseForm: document.getElementById('fixedExpenseForm'),
  fixedPaymentAccount: document.getElementById('fixedPaymentAccount'),
};

function normalizeIncome(row) {
  return {
    id: row.id,
    type: 'income',
    title: row.title,
    category: row.income_type,
    value: Number(row.amount || 0),
    date: row.received_on,
    method: 'conta',
    recurring: true,
  };
}

function normalizeExpense(row) {
  return {
    id: row.id,
    type: 'expense',
    title: row.title,
    category: row.category,
    value: Number(row.amount || 0),
    date: row.occurred_on,
    cardId: row.card_id || null,
    method: 'cartao',
    recurring: Boolean(row.is_installment),
  };
}

function syncMovementCategoryPlaceholder() {
  const type = document.getElementById('movementType')?.value || 'income';
  const categoryInput = document.getElementById('movementCategory');

  if (!categoryInput) return;

  categoryInput.placeholder = type === 'income'
    ? 'Ex.: Salário 15, Bônus, Outro'
    : 'Ex.: Mercado, Cartão, Viagem';
}

function normalizeFixed(row) {
  return {
    id: row.id,
    name: row.name,
    value: Number(row.amount || 0),
    dueDay: Number(row.due_day || 1),
    status: row.status === 'paid' ? 'paid' : 'scheduled',
    paymentAccountId: row.payment_account_id,
    paymentMethod: row.payment_method || 'manual',
  };
}

function normalizeBudgetMonth(row) {
  return {
    id: row.id,
    monthStart: row.month_start ? String(row.month_start).slice(0, 7) : '',
    openingBalance: Number(row.opening_balance || 0),
    balance: Number(row.balance || row.opening_balance || 0),
    totalIncome: Number(row.total_income || 0),
    totalFixedExpenses: Number(row.total_fixed_expenses || 0),
    totalCardExpenses: Number(row.total_card_expenses || 0),
    totalAdjustments: Number(row.total_adjustments || 0),
  };
}

async function ensureCategoryExists(categoryName) {
  if (!supabaseClient) return;

  const normalized = categoryName.trim();
  if (!normalized) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { error } = await supabaseClient
    .from('card_categories')
    .upsert(
      [{ user_id: user.id, name: normalized }],
      { onConflict: 'user_id,name' }
    );

  if (error) {
    console.warn('Erro ao salvar categoria:', error);
  }
}

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}/${String(year).slice(-2)}`;
}

function getMonthOptions() {
  const [year, month] = state.selectedMonth.split('-').map(Number);
  const anchor = new Date(year, month - 1, 1);
  const months = [];

  for (let offset = -12; offset <= 12; offset += 1) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return months;
}

function getSelectedMonthDateValue() {
  const [year, month] = state.selectedMonth.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

async function refreshMonthData() {
  await loadData();
  await loadSalaryCycle();
  render();
  renderSalaryCycle();
}

function renderMonthSelector() {
  if (!els.monthSelector) return;

  const options = getMonthOptions();
  els.monthSelector.innerHTML = options
    .map((monthKey) => `
      <button
        type="button"
        class="month-pill ${monthKey === state.selectedMonth ? 'active' : ''}"
        data-month="${monthKey}"
      >
        ${formatMonthLabel(monthKey)}
      </button>
    `)
    .join('');

  const activeMonthButton = els.monthSelector.querySelector('.month-pill.active');
  if (activeMonthButton) {
    activeMonthButton.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
  }

  els.monthSelector.querySelectorAll('[data-month]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedMonth = button.dataset.month;
      renderMonthSelector();
      renderWorkbookTabs();
      await refreshMonthData();
    });
  });
}

function renderWorkbookTabs() {
  if (!els.sheetTabs) return;

  if (state.creditCards.length && (!state.activeSheetTab || state.activeSheetTab === 'cards')) {
    state.activeSheetTab = `card-${state.creditCards[0].id}`;
    state.activeCardId = state.creditCards[0].id;
  }

  const tabs = [
    ...state.creditCards.map((card) => ({
      id: `card-${card.id}`,
      label: card.name,
    })),
    { id: 'accounts', label: 'Contas' },
    { id: 'debts', label: 'Débitos' },
    { id: 'transfers', label: 'Transferências' },
    { id: 'balance', label: 'Saldo' },
  ];

  els.sheetTabs.innerHTML = tabs
    .map((tab) => `
      <button
        type="button"
        class="sheet-tab ${state.activeSheetTab === tab.id ? 'active' : ''}"
        data-sheet-tab="${tab.id}"
      >
        ${tab.label}
      </button>
    `)
    .join('');

  const activeSheetButton = els.sheetTabs.querySelector('.sheet-tab.active');
  if (activeSheetButton) {
    activeSheetButton.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
  }
}

function readLocalData() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    state.entries = [];
    state.fixedExpenses = [];
    saveData();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    state.fixedExpenses = Array.isArray(parsed.fixedExpenses) ? parsed.fixedExpenses : [];
  } catch {
    state.entries = [];
    state.fixedExpenses = [];
  }
}

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      entries: state.entries,
      fixedExpenses: state.fixedExpenses,
    })
  );
}

async function loadData() {
  if (!supabaseClient) {
    readLocalData();
    return;
  }

  const selectedMonth = getCurrentBudgetMonth(state.selectedMonth);

  const { data: incomes, error: incomesError } = await supabaseClient
    .from('incomes')
    .select('*')
    .order('received_on', { ascending: false });

  const { data: fixedExpenses, error: fixedError } = await supabaseClient
    .from('fixed_expenses')
    .select('*')
    .order('due_day', { ascending: true });

  const { data: cardExpenses, error: cardExpensesError } = await supabaseClient
    .from('card_expenses')
    .select('*')
    .order('occurred_on', { ascending: false });

  const { data: fixedPayments, error: fixedPaymentsError } = await supabaseClient
    .from('fixed_expense_payments')
    .select('*')
    .eq('budget_month', selectedMonth);

  if (incomesError) {
    console.warn('Erro ao carregar incomes:', incomesError);
  }

  if (fixedError) {
    console.warn('Erro ao carregar contas fixas:', fixedError);
  }

  if (fixedPaymentsError) {
    console.warn('Erro ao carregar pagamentos de contas fixas:', fixedPaymentsError);
  }

  if (cardExpensesError) {
    console.warn('Erro ao carregar gastos de cartão:', cardExpensesError);
  }

  const normalizedEntries = [
    ...(incomes && incomes.length ? incomes.map(normalizeIncome) : []),
    ...(cardExpenses && cardExpenses.length ? cardExpenses.map(normalizeExpense) : []),
  ];

  state.entries = normalizedEntries;
  state.fixedExpenses = fixedExpenses && fixedExpenses.length ? fixedExpenses.map(normalizeFixed) : [];
  state.fixedPayments = fixedPayments || [];
  saveData();
}

async function loadSettings() {
  if (!supabaseClient) return;

  const [{ data: creditCards }, { data: accounts }, { data: reserves }, { data: budgetMonths }] = await Promise.all([
    supabaseClient.from('credit_cards').select('*').eq('active', true).order('name'),
    supabaseClient.from('accounts').select('*').eq('active', true).order('name'),
    supabaseClient.from('reserve_plans').select('*').eq('active', true).order('target_month'),
    supabaseClient.from('budget_months').select('*').order('month_start', { ascending: true }),
  ]);

  state.creditCards = creditCards || [];
  state.accounts = accounts || [];
  state.reserves = reserves || [];
  state.budgetMonths = (budgetMonths || []).map(normalizeBudgetMonth);

  if (state.budgetMonths.length && !state.budgetMonths.some((month) => month.monthStart === state.selectedMonth)) {
    state.selectedMonth = state.budgetMonths[0].monthStart;
  }
}

function renderSettings() {
  els.creditCardsList.innerHTML = state.creditCards.length
    ? state.creditCards.map((card) => `<div class="compact-list-item"><strong>${card.name}</strong><span>Fecha ${card.closing_day || '-'} | vence ${card.due_day || '-'}</span></div>`).join('')
    : '<p class="empty-inline">Nenhum cartão cadastrado.</p>';
  els.accountsList.innerHTML = state.accounts.length
    ? state.accounts.map((account) => `<div class="compact-list-item"><strong>${account.name}</strong><span>${account.account_type}</span></div>`).join('')
    : '<p class="empty-inline">Nenhuma conta cadastrada.</p>';
  els.reservesList.innerHTML = state.reserves.length
    ? state.reserves.map((reserve) => `<div class="compact-list-item"><strong>${reserve.name}</strong><span>Meta ${formatCurrency(reserve.target_amount)} | ${new Date(`${reserve.target_month}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span></div>`).join('')
    : '<p class="empty-inline">Nenhum gasto futuro cadastrado.</p>';
  els.budgetMonthsList.innerHTML = state.budgetMonths.length
    ? state.budgetMonths.map((month) => `<div class="compact-list-item"><strong>${formatMonthLabel(month.monthStart)}</strong><span>Saldo inicial ${formatCurrency(month.openingBalance)}</span></div>`).join('')
    : '<p class="empty-inline">Nenhum mês de planejamento cadastrado.</p>';

  els.fixedPaymentAccount.innerHTML = '<option value="">Não se aplica</option>' + state.accounts
    .map((account) => `<option value="${account.id}">${account.name}</option>`)
    .join('');

  if (els.movementCardId) {
    const hasCards = state.creditCards.length > 0;
    els.movementCardId.innerHTML = hasCards
      ? state.creditCards.map((card) => `<option value="${card.id}">${card.name}</option>`).join('')
      : '<option value="">Cadastre um cartão</option>';

    if (!state.activeCardId && state.creditCards[0]) {
      state.activeCardId = state.creditCards[0].id;
    }

    if (state.activeCardId) {
      els.movementCardId.value = state.activeCardId;
    }
  }
}

async function getCurrentUserId() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user?.id;
}

function getCurrentMonthEntries() {
  const monthKey = state.selectedMonth;
  const [year, month] = monthKey.split('-').map(Number);

  return state.entries.filter((entry) => {
    const date = new Date(entry.date);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
}

function getCurrentBudgetMonth(monthKey = state.selectedMonth) {
  return `${monthKey}-01`;
}

async function loadSalaryCycle() {
  if (!supabaseClient) return;

  const [{ data: salaryConfirmations }, { data: topups }] = await Promise.all([
    supabaseClient.from('salary_confirmations').select('*').order('salary_date', { ascending: false }),
    supabaseClient.from('budget_topups').select('*').eq('budget_month', getCurrentBudgetMonth(state.selectedMonth)).order('occurred_on', { ascending: false }),
  ]);

  state.salaryConfirmations = salaryConfirmations || [];
  state.topups = topups || [];
}

function getSalaryDate(salaryPart, monthKey = state.selectedMonth) {
  const [year, month] = monthKey.split('-').map(Number);
  const day = salaryPart === 'day_15' ? 15 : 30;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getSalaryExpectation(salaryPart, monthKey = state.selectedMonth) {
  const currentDate = getSalaryDate(salaryPart, monthKey);
  return state.salaryConfirmations.find((item) => item.salary_part === salaryPart && item.salary_date < currentDate)?.confirmed_amount || null;
}

function renderSalaryCycle() {
  const monthKey = state.selectedMonth;
  const current15 = state.salaryConfirmations.find((item) => item.salary_date === getSalaryDate('day_15', monthKey));
  const current30 = state.salaryConfirmations.find((item) => item.salary_date === getSalaryDate('day_30', monthKey));
  const expected15 = getSalaryExpectation('day_15', monthKey);
  const expected30 = getSalaryExpectation('day_30', monthKey);

  els.salary15Expected.textContent = current15
    ? `Confirmado: ${formatCurrency(current15.confirmed_amount)}`
    : expected15 ? `Previsão do mês anterior: ${formatCurrency(expected15)}` : 'Sem previsão anterior';
  els.salary30Expected.textContent = current30
    ? `Confirmado: ${formatCurrency(current30.confirmed_amount)}`
    : expected30 ? `Previsão do mês anterior: ${formatCurrency(expected30)}` : 'Sem previsão anterior';
  els.salary15Amount.value = current15?.confirmed_amount || expected15 || '';
  els.salary30Amount.value = current30?.confirmed_amount || expected30 || '';
}

async function confirmSalary(event, salaryPart) {
  event.preventDefault();
  const input = salaryPart === 'day_15' ? els.salary15Amount : els.salary30Amount;
  const confirmedAmount = Number(input.value);
  const userId = await getCurrentUserId();
  if (!userId || Number.isNaN(confirmedAmount) || confirmedAmount < 0) return;

  await supabaseClient.from('salary_confirmations').upsert({
    user_id: userId,
    salary_date: getSalaryDate(salaryPart, state.selectedMonth),
    salary_part: salaryPart,
    expected_amount: getSalaryExpectation(salaryPart, state.selectedMonth),
    confirmed_amount: confirmedAmount,
    confirmed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,salary_date,salary_part' });
  await loadSalaryCycle();
  renderSalaryCycle();
  render();
}

async function addTopup(event) {
  event.preventDefault();
  const amount = Number(document.getElementById('topupAmount').value);
  const source = document.getElementById('topupSource').value.trim();
  const userId = await getCurrentUserId();
  if (!userId || !source || Number.isNaN(amount) || amount <= 0) return;

  await supabaseClient.from('budget_topups').insert({
    user_id: userId,
    budget_month: getCurrentBudgetMonth(state.selectedMonth),
    amount,
    source,
    occurred_on: new Date().toISOString().slice(0, 10),
  });
  event.target.reset();
  await loadSalaryCycle();
  renderSalaryCycle();
  render();
}

async function addCreditCard(event) {
  event.preventDefault();
  const userId = await getCurrentUserId();
  const name = document.getElementById('cardName').value.trim();
  if (!userId || !name) return;
  await supabaseClient.from('credit_cards').insert({
    user_id: userId,
    name,
    closing_day: Number(document.getElementById('cardClosingDay').value) || null,
    due_day: Number(document.getElementById('cardDueDay').value) || null,
  });
  event.target.reset();
  await loadSettings();
  renderSettings();
}

async function addAccount(event) {
  event.preventDefault();
  const userId = await getCurrentUserId();
  const name = document.getElementById('accountName').value.trim();
  if (!userId || !name) return;
  await supabaseClient.from('accounts').insert({ user_id: userId, name, account_type: document.getElementById('accountType').value });
  event.target.reset();
  await loadSettings();
  renderSettings();
}

async function addReservePlan(event) {
  event.preventDefault();
  const userId = await getCurrentUserId();
  const name = document.getElementById('reserveName').value.trim();
  const targetAmount = Number(document.getElementById('reserveTarget').value);
  const targetMonth = document.getElementById('reserveMonth').value;
  if (!userId || !name || !targetAmount || !targetMonth) return;
  await supabaseClient.from('reserve_plans').insert({
    user_id: userId,
    name,
    target_amount: targetAmount,
    target_month: `${targetMonth}-01`,
    monthly_contribution: Number(document.getElementById('reserveContribution').value) || null,
  });
  event.target.reset();
  await loadSettings();
  renderSettings();
}

async function addBudgetMonth(event) {
  event.preventDefault();
  const userId = await getCurrentUserId();
  const monthValue = document.getElementById('budgetMonthStart')?.value;
  const openingBalance = Number(document.getElementById('budgetMonthOpeningBalance')?.value || 0);

  if (!userId || !monthValue || Number.isNaN(openingBalance) || openingBalance < 0) return;

  const monthStart = `${monthValue}-01`;

  await supabaseClient.from('budget_months').upsert({
    user_id: userId,
    month_start: monthStart,
    opening_balance: openingBalance,
    balance: openingBalance,
    total_income: 0,
    total_fixed_expenses: 0,
    total_card_expenses: 0,
    total_adjustments: 0,
  }, { onConflict: 'user_id,month_start' });

  state.selectedMonth = monthValue;
  event.target.reset();
  await loadSettings();
  renderSettings();
  render();
  renderSalaryCycle();
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getActiveSheetMeta() {
  const activeTabButton = document.querySelector('.sheet-tab.active');
  const activeSheetKey = activeTabButton?.dataset.sheetTab || state.activeSheetTab;
  const isCardTab = Boolean(activeSheetKey && activeSheetKey.startsWith('card-'));
  const selectedCardId = isCardTab ? state.activeCardId || state.creditCards.find((card) => `card-${card.id}` === activeSheetKey)?.id || state.creditCards[0]?.id : null;
  const selectedCard = state.creditCards.find((card) => card.id === selectedCardId) || null;

  return {
    isCardTab,
    selectedCard,
    activeSheetKey,
  };
}

function renderSummary() {
  const activeTabButton = document.querySelector('.sheet-tab.active');
  const activeTabKey = activeTabButton?.dataset.sheetTab || state.activeSheetTab;
  if (activeTabKey) {
    state.activeSheetTab = activeTabKey;
    if (activeTabKey.startsWith('card-')) {
      state.activeCardId = activeTabKey.replace('card-', '');
    }
  }

  const totalIncome = state.entries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  const totalExpense = state.entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  const currentMonthEntries = getCurrentMonthEntries();
  const monthIncome = currentMonthEntries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  const monthExpense = currentMonthEntries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  const monthKey = state.selectedMonth;
  const currentMonthSalary = state.salaryConfirmations
    .filter((item) => item.salary_date.startsWith(monthKey))
    .reduce((sum, item) => sum + Number(item.confirmed_amount), 0);
  const currentMonthTopups = state.topups
    .filter((item) => item.budget_month === getCurrentBudgetMonth(monthKey))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const { isCardTab, selectedCard, activeSheetKey } = getActiveSheetMeta();
  const activeTabLabel = document.querySelector('.sheet-tab.active')?.textContent?.trim() || selectedCard?.name || 'Cartão';
  const resolvedCardName = selectedCard?.name || activeTabLabel || (activeSheetKey ? activeSheetKey.replace('card-', '') : 'Cartão');
  const cardMonthlyExpense = isCardTab
    ? currentMonthEntries
        .filter((entry) => entry.type === 'expense' && entry.cardId === (state.activeCardId || state.creditCards[0]?.id))
        .reduce((sum, entry) => sum + Number(entry.value), 0)
    : monthExpense;

  const monthBalance = monthIncome + currentMonthSalary + currentMonthTopups - (isCardTab ? cardMonthlyExpense : monthExpense);
  const accountsTotal = monthExpense + state.fixedExpenses.reduce((sum, item) => sum + Number(item.value), 0);
  const creditCardTotal = state.entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  const monthStamp = `Mês de ${formatMonthLabel(monthKey)}`;
  const stamp = document.querySelector('.sheet-summary-stamp');
  if (stamp) {
    stamp.textContent = monthStamp;
  }

  const monthHero = document.querySelector('.monthly-hero .hero-heading');
  const monthEyebrow = monthHero?.querySelector('.eyebrow');
  const monthHeadline = monthHero?.querySelector('strong');
  const monthParagraphs = monthHero ? Array.from(monthHero.querySelectorAll('p')) : [];
  const monthDescription = monthParagraphs[monthParagraphs.length - 1] || null;

  if (monthEyebrow && monthHeadline && monthDescription) {
    if (isCardTab) {
      monthEyebrow.textContent = `Fatura ${resolvedCardName}`;
      monthHeadline.textContent = formatCurrency(cardMonthlyExpense);
      monthDescription.textContent = `Gastos do cartão ${resolvedCardName} registrados neste mês.`;
    } else if (state.activeSheetTab === 'accounts') {
      monthEyebrow.textContent = 'Contas do mês';
      monthHeadline.textContent = formatCurrency(accountsTotal);
      monthDescription.textContent = 'Resumo das faturas, débitos e contas fixas pendentes.';
    } else if (state.activeSheetTab === 'debts') {
      monthEyebrow.textContent = 'Débitos do mês';
      monthHeadline.textContent = formatCurrency(monthExpense + state.fixedExpenses.reduce((sum, item) => sum + Number(item.value), 0));
      monthDescription.textContent = 'Resumo dos débitos e compromissos do período.';
    } else if (state.activeSheetTab === 'transfers') {
      monthEyebrow.textContent = 'Transferências';
      monthHeadline.textContent = formatCurrency(monthBalance);
      monthDescription.textContent = 'Resumo das transferências e movimentações entre contas.';
    } else if (state.activeSheetTab === 'balance') {
      monthEyebrow.textContent = 'Saldo disponível';
      monthHeadline.textContent = formatCurrency(monthBalance);
      monthDescription.textContent = 'Resultado de receitas e gastos registrados neste mês.';
    } else {
      monthEyebrow.textContent = 'Saldo disponível';
      monthHeadline.textContent = formatCurrency(monthBalance);
      monthDescription.textContent = 'Resultado de receitas e gastos registrados neste mês.';
    }
  }

  els.receitaTotal.textContent = formatCurrency(totalIncome);
  els.despesaTotal.textContent = formatCurrency(totalExpense);
  els.saldoTotal.textContent = formatCurrency(totalIncome - totalExpense);
  els.cartaoTotal.textContent = formatCurrency(creditCardTotal);

  els.monthIncome.textContent = formatCurrency(isCardTab ? monthIncome : monthIncome + currentMonthSalary + currentMonthTopups);
  els.monthExpense.textContent = formatCurrency(isCardTab ? cardMonthlyExpense : monthExpense);
  els.monthBalance.textContent = isCardTab && selectedCard
    ? formatCurrency(cardMonthlyExpense)
    : formatCurrency(monthBalance);
}

function renderFixedExpenses() {
  const monthKey = state.selectedMonth;
  const currentMonthBudget = getCurrentBudgetMonth(monthKey);

  if (!state.fixedExpenses.length) {
    els.fixedExpensesList.innerHTML = '<div class="empty-state">Nenhuma conta fixa cadastrada.</div>';
    return;
  }

  els.fixedExpensesList.innerHTML = state.fixedExpenses
    .map(
      (item) => {
        const payment = state.fixedPayments.find((current) => current.fixed_expense_id === item.id && current.budget_month === currentMonthBudget);
        const account = state.accounts.find((current) => current.id === item.paymentAccountId);
        const status = payment ? `Paga em ${new Date(`${payment.paid_on}T00:00:00`).toLocaleDateString('pt-BR')}` : 'Aguardando confirmação';
        const debitDestination = item.paymentMethod === 'automatic_debit' && account ? `Débito: ${account.name}` : 'Pagamento manual';
        return `
        <div class="list-item">
          <div class="meta">
            <span>${item.name}</span>
            <span>Vence dia ${item.dueDay} | ${debitDestination}</span>
            <span>${status}</span>
          </div>
          <div class="fixed-item-actions"><strong>${formatCurrency(item.value)}</strong>${payment ? '' : `<button class="confirm-fixed-button" type="button" data-fixed-payment="${item.id}">Confirmar</button>`}</div>
        </div>
      `;
      }
    )
    .join('');

  document.querySelectorAll('[data-fixed-payment]').forEach((button) => {
    button.addEventListener('click', () => confirmFixedExpensePayment(button.dataset.fixedPayment));
  });
}

async function confirmFixedExpensePayment(fixedExpenseId) {
  const fixedExpense = state.fixedExpenses.find((item) => item.id === fixedExpenseId);
  const userId = await getCurrentUserId();
  if (!fixedExpense || !userId) return;

  const { error } = await supabaseClient.from('fixed_expense_payments').insert({
    user_id: userId,
    fixed_expense_id: fixedExpense.id,
    budget_month: getCurrentBudgetMonth(state.selectedMonth),
    amount: fixedExpense.value,
    paid_on: new Date().toISOString().slice(0, 10),
    payment_account_id: fixedExpense.paymentAccountId || null,
    payment_method: fixedExpense.paymentMethod,
  });

  if (!error) {
    await loadData();
    render();
  }
}

function renderSheetContent() {
  const monthEntries = getCurrentMonthEntries();

  if (state.activeSheetTab === 'accounts') {
    const accountRows = [
      ...state.creditCards.map((card) => {
        const total = monthEntries
          .filter((entry) => entry.type === 'expense' && entry.cardId === card.id)
          .reduce((sum, entry) => sum + Number(entry.value), 0);
        return {
          title: `Fatura ${card.name}`,
          value: total,
          kind: 'expense',
          meta: card.due_day ? `Vence dia ${card.due_day}` : 'Fatura',
        };
      }),
      ...state.fixedExpenses.map((item) => ({
        title: item.name,
        value: Number(item.value || 0),
        kind: 'expense',
        meta: `Vence dia ${item.dueDay}`,
      })),
    ].filter((row) => row.value > 0);

    if (!accountRows.length) {
      els.transactionsList.innerHTML = '<div class="empty-state">Nenhuma conta para confirmar neste mês.</div>';
      els.fixedExpensesList.innerHTML = '';
      return;
    }

    els.transactionsList.innerHTML = accountRows
      .map((row) => `
        <div class="transaction-item">
          <div>
            <strong>${row.title}</strong>
            <small>${row.meta}</small>
          </div>
          <div class="amount expense">${formatCurrency(row.value)}</div>
        </div>
      `)
      .join('');
    els.fixedExpensesList.innerHTML = state.fixedExpenses
      .map((item) => {
        const payment = state.fixedPayments.find((current) => current.fixed_expense_id === item.id && current.budget_month === getCurrentBudgetMonth(state.selectedMonth));
        const status = payment ? `Pago em ${new Date(`${payment.paid_on}T00:00:00`).toLocaleDateString('pt-BR')}` : 'Pendente';
        return `
          <div class="transaction-item">
            <div>
              <strong>${item.name}</strong>
              <small>Vence dia ${item.dueDay} • ${status}</small>
            </div>
            <div class="amount expense">${formatCurrency(item.value)}</div>
          </div>
        `;
      })
      .join('');
    return;
  }

  if (state.activeSheetTab === 'debts') {
    const debts = state.fixedExpenses.map((item) => {
      const payment = state.fixedPayments.find((current) => current.fixed_expense_id === item.id && current.budget_month === getCurrentBudgetMonth(state.selectedMonth));
      return { ...item, payment };
    });

    if (!debts.length) {
      els.fixedExpensesList.innerHTML = '<div class="empty-state">Nenhum débito cadastrado para este mês.</div>';
      els.transactionsList.innerHTML = '';
      return;
    }

    els.fixedExpensesList.innerHTML = debts
      .map((item) => {
        const status = item.payment ? `Pago em ${new Date(`${item.payment.paid_on}T00:00:00`).toLocaleDateString('pt-BR')}` : 'Pendente';
        return `
          <div class="transaction-item">
            <div>
              <strong>${item.name}</strong>
              <small>Vence dia ${item.dueDay} • ${status}</small>
            </div>
            <div class="amount expense">${formatCurrency(item.value)}</div>
          </div>
        `;
      })
      .join('');
    els.transactionsList.innerHTML = '';
    return;
  }

  if (state.activeSheetTab === 'transfers') {
    els.transactionsList.innerHTML = '<div class="empty-state">Transferências do período ainda não foram registradas.</div>';
    els.fixedExpensesList.innerHTML = '';
    return;
  }

  if (state.activeSheetTab === 'balance') {
    const balanceRows = [
      { label: 'Entradas do mês', value: formatCurrency(monthEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.value), 0) + state.salaryConfirmations.filter((item) => item.salary_date.startsWith(state.selectedMonth)).reduce((sum, item) => sum + Number(item.confirmed_amount), 0) + state.topups.filter((item) => item.budget_month === getCurrentBudgetMonth(state.selectedMonth)).reduce((sum, item) => sum + Number(item.amount), 0)) },
      { label: 'Saídas do mês', value: formatCurrency(monthEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.value), 0)) },
      { label: 'Saldo do mês', value: formatCurrency((monthEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.value), 0) + state.salaryConfirmations.filter((item) => item.salary_date.startsWith(state.selectedMonth)).reduce((sum, item) => sum + Number(item.confirmed_amount), 0) + state.topups.filter((item) => item.budget_month === getCurrentBudgetMonth(state.selectedMonth)).reduce((sum, item) => sum + Number(item.amount), 0)) - monthEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.value), 0)) },
    ];

    els.transactionsList.innerHTML = balanceRows.map((row) => `
      <div class="transaction-item">
        <div><strong>${row.label}</strong></div>
        <div class="amount ${row.label.includes('Saldo') ? 'income' : 'expense'}">${row.value}</div>
      </div>
    `).join('');
    els.fixedExpensesList.innerHTML = '';
    return;
  }

  const selectedCardId = state.activeCardId || state.creditCards[0]?.id;
  const filteredEntries = selectedCardId
    ? monthEntries.filter((entry) => entry.type === 'expense' && entry.cardId === selectedCardId)
    : monthEntries.filter((entry) => entry.type === 'expense');

  if (!filteredEntries.length) {
    els.transactionsList.innerHTML = '<div class="empty-state">Nenhum lançamento para este cartão neste mês.</div>';
    els.fixedExpensesList.innerHTML = '';
    return;
  }

  const sorted = [...filteredEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

  els.transactionsList.innerHTML = sorted
    .map(
      (entry) => `
        <div class="transaction-item">
          <div>
            <strong>${entry.title}</strong>
            <small>${entry.category} • ${new Date(entry.date).toLocaleDateString('pt-BR')}</small>
          </div>
          <div class="amount expense">-${formatCurrency(entry.value)}</div>
        </div>
      `
    )
    .join('');
  els.fixedExpensesList.innerHTML = '';
}

function renderTransactions() {
  renderSheetContent();
}

async function addMovement(event) {
  event.preventDefault();

  const type = document.getElementById('movementType').value;
  const title = document.getElementById('movementTitle').value.trim();
  const category = document.getElementById('movementCategory').value.trim();
  const value = Number(document.getElementById('movementValue').value);
  const date = document.getElementById('movementDate').value;
  const cardId = document.getElementById('movementCardId')?.value || null;
  const recurring = document.getElementById('movementRecurring').checked;

  if (!title || !category || !date || Number.isNaN(value) || value <= 0) {
    return;
  }

  if (supabaseClient && type === 'income') {
    const payload = {
      user_id: (await supabaseClient.auth.getUser()).data.user.id,
      income_type: category,
      title,
      amount: value,
      received_on: date,
      budget_month: `${date.slice(0, 7)}-01`,
      notes: recurring ? 'recorrente' : '',
    };

    const { error } = await supabaseClient.from('incomes').insert([payload]);
    if (!error) {
      await loadData();
      render();
      event.target.reset();
      initializeFormDefaults();
      syncMovementCategoryPlaceholder();
      return;
    }
  }

  if (supabaseClient && type === 'expense') {
    await ensureCategoryExists(category);

    const payload = {
      user_id: (await supabaseClient.auth.getUser()).data.user.id,
      title,
      category,
      amount: value,
      occurred_on: date,
      invoice_month: `${date.slice(0, 7)}-01`,
      card_id: cardId || null,
      is_installment: false,
      installments_total: null,
      installment_current: null,
      notes: recurring ? 'recorrente' : '',
    };

    const { error } = await supabaseClient.from('card_expenses').insert([payload]);
    if (!error) {
      await loadData();
      render();
      event.target.reset();
      initializeFormDefaults();
      syncMovementCategoryPlaceholder();
      return;
    }
  }

  state.entries.push({
    id: crypto.randomUUID(),
    type,
    title,
    category,
    value,
    date,
    cardId: type === 'expense' ? cardId : null,
    method: type === 'expense' ? 'cartao' : 'conta',
    recurring,
  });

  saveData();
  render();
  event.target.reset();
  initializeFormDefaults();
  syncMovementCategoryPlaceholder();
}

async function addFixedExpense(event) {
  event.preventDefault();

  const name = document.getElementById('fixedName').value.trim();
  const value = Number(document.getElementById('fixedValue').value);
  const dueDay = Number(document.getElementById('fixedDay').value);
  const paymentMethod = document.getElementById('fixedPaymentMethod').value;
  const paymentAccountId = els.fixedPaymentAccount.value || null;

  if (!name || Number.isNaN(value) || value <= 0 || dueDay < 1 || dueDay > 31) {
    return;
  }

  if (supabaseClient) {
    const payload = {
      user_id: (await supabaseClient.auth.getUser()).data.user.id,
      name,
      amount: value,
      due_day: dueDay,
      category: 'fixa',
      status: 'scheduled',
      paid_at: null,
      active: true,
      recurring: true,
      notes: '',
      payment_method: paymentMethod,
      payment_account_id: paymentAccountId,
    };

    const { error } = await supabaseClient.from('fixed_expenses').insert([payload]);
    if (!error) {
      await loadData();
      render();
      event.target.reset();
      document.getElementById('fixedDay').value = 5;
      return;
    }
  }

  state.fixedExpenses.push({ id: crypto.randomUUID(), name, value, dueDay, status: 'scheduled', paymentMethod, paymentAccountId });
  saveData();
  render();
  event.target.reset();
  document.getElementById('fixedDay').value = 5;
}

function renderContextualPanels() {
  const isCardContext = Boolean(state.activeSheetTab && state.activeSheetTab.startsWith('card-'));
  const salarySection = document.querySelector('.salary-cycle');

  if (salarySection) {
    salarySection.classList.toggle('hidden', isCardContext);
  }
}

function render() {
  const activeTabKey = state.activeSheetTab || document.querySelector('.sheet-tab.active')?.dataset.sheetTab;

  if (activeTabKey && activeTabKey.startsWith('card-')) {
    state.activeSheetTab = activeTabKey;
    state.activeCardId = activeTabKey.replace('card-', '');
  }

  if (state.creditCards.length && !state.activeCardId) {
    state.activeCardId = state.creditCards[0].id;
  }

  if (state.creditCards.length && (!state.activeSheetTab || state.activeSheetTab === 'cards')) {
    state.activeSheetTab = `card-${state.creditCards[0].id}`;
    state.activeCardId = state.creditCards[0].id;
  }

  renderContextualPanels();
  renderMonthSelector();
  renderWorkbookTabs();
  renderSummary();
  renderFixedExpenses();
  renderTransactions();

  const stamp = document.querySelector('.sheet-summary-stamp');
  if (!stamp) {
    const target = document.querySelector('.hero-heading');
    if (target) {
      const badge = document.createElement('span');
      badge.className = 'sheet-summary-stamp';
      badge.textContent = `Mês de ${formatMonthLabel(state.selectedMonth)}`;
      target.appendChild(badge);
    }
  }
}

function initializeFormDefaults() {
  const defaultDate = getSelectedMonthDateValue();

  document.getElementById('movementDate').value = defaultDate;
  if (document.getElementById('movementCardId') && state.creditCards.length) {
    document.getElementById('movementCardId').value = state.activeCardId || state.creditCards[0].id;
  }
  document.getElementById('fixedDay').value = 5;
  syncMovementCategoryPlaceholder();
}

async function handleAuthSubmit(mode = 'signIn') {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  if (!email || !password) {
    els.authMessage.textContent = 'Informe e-mail e senha.';
    return;
  }

  if (!supabaseClient) {
    els.authMessage.textContent = 'Supabase não configurado. Verifique config.js.';
    return;
  }

  try {
    let result;

    if (mode === 'signUp') {
      result = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin || 'http://localhost:8000',
        },
      });

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.session) {
        els.authMessage.textContent = 'Conta criada. Confirme o e-mail antes do primeiro login.';
        return;
      }
    } else {
      result = await supabaseClient.auth.signInWithPassword({ email, password });

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.session) {
        throw new Error('Autenticação concluída, mas não foi gerada uma sessão. Verifique a configuração do Supabase.');
      }
    }

    els.authMessage.textContent = mode === 'signUp' ? 'Conta criada com sucesso.' : 'Login realizado com sucesso.';
    renderAuthenticatedState();
  } catch (error) {
    const message = error?.message || 'Não foi possível autenticar.';
    els.authMessage.textContent = message.includes('Email not confirmed')
      ? 'E-mail ainda não confirmado. Confirme sua conta no e-mail antes de entrar.'
      : message;
  }
}

async function handleSignOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  renderAuthenticatedState();
}

async function renderAuthenticatedState() {
  if (!supabaseClient) {
    els.authScreen.classList.remove('hidden');
    els.appScreen.classList.add('hidden');
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  const loggedIn = Boolean(session);
  els.authScreen.classList.toggle('hidden', loggedIn);
  els.appScreen.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    await loadData();
    await loadSettings();
    await loadSalaryCycle();
    initializeFormDefaults();
    render();
    renderSettings();
    renderSalaryCycle();
  }
}

function bindMonthTabs() {
  if (!els.sheetTabs) return;

  els.sheetTabs.addEventListener('click', (event) => {
    const target = event.target.closest('[data-sheet-tab]');
    if (!target) return;

    const selectedTab = target.dataset.sheetTab;
    state.activeSheetTab = selectedTab;

    if (selectedTab.startsWith('card-')) {
      state.activeCardId = selectedTab.replace('card-', '');
    }

    render();
  });
}

function bindQuickActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const map = {
        income: () => {
          document.getElementById('movementType').value = 'income';
          syncMovementCategoryPlaceholder();
          document.getElementById('movementTitle').focus();
        },
        card: () => {
          document.getElementById('movementType').value = 'expense';
          syncMovementCategoryPlaceholder();
          document.getElementById('movementTitle').focus();
        },
        fixed: () => document.getElementById('fixedName').focus(),
        confirm: () => document.getElementById('fixedName').focus(),
        month: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      };

      if (map[action]) map[action]();
    });
  });
}

els.authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  handleAuthSubmit('signIn');
});

els.signUpBtn.addEventListener('click', () => handleAuthSubmit('signUp'));
els.signOutBtn.addEventListener('click', handleSignOut);
els.movementForm.addEventListener('submit', addMovement);
els.fixedExpenseForm.addEventListener('submit', addFixedExpense);
els.settingsBtn.addEventListener('click', () => {
  els.settingsPanel.classList.remove('hidden');
  els.settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
els.closeSettingsBtn.addEventListener('click', () => els.settingsPanel.classList.add('hidden'));
els.cardSettingsForm.addEventListener('submit', addCreditCard);
els.accountSettingsForm.addEventListener('submit', addAccount);
els.reserveSettingsForm.addEventListener('submit', addReservePlan);
els.budgetMonthForm?.addEventListener('submit', addBudgetMonth);
els.salary15Form.addEventListener('submit', (event) => confirmSalary(event, 'day_15'));
els.salary30Form.addEventListener('submit', (event) => confirmSalary(event, 'day_30'));
els.topupForm.addEventListener('submit', addTopup);

document.getElementById('movementType')?.addEventListener('change', syncMovementCategoryPlaceholder);
bindQuickActions();
bindMonthTabs();
readLocalData();
initializeFormDefaults();
render();
window.lucide?.createIcons();

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session) {
      renderAuthenticatedState();
    } else {
      els.authScreen.classList.remove('hidden');
      els.appScreen.classList.add('hidden');
    }
  });
}
