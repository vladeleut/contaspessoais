const STORAGE_KEY = 'contas-pessoais';

const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG || {};
const supabaseClient = supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

const state = {
  entries: [],
  fixedExpenses: [],
  settings: null,
  creditCards: [],
  accounts: [],
  reserves: [],
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
  salarySettingsForm: document.getElementById('salarySettingsForm'),
  cardSettingsForm: document.getElementById('cardSettingsForm'),
  accountSettingsForm: document.getElementById('accountSettingsForm'),
  reserveSettingsForm: document.getElementById('reserveSettingsForm'),
  creditCardsList: document.getElementById('creditCardsList'),
  accountsList: document.getElementById('accountsList'),
  reservesList: document.getElementById('reservesList'),
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
  fixedExpenseForm: document.getElementById('fixedExpenseForm'),
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

  const { data: incomes, error: incomesError } = await supabaseClient
    .from('incomes')
    .select('*')
    .order('received_on', { ascending: false });

  const { data: fixedExpenses, error: fixedError } = await supabaseClient
    .from('fixed_expenses')
    .select('*')
    .order('due_day', { ascending: true });

  if (incomesError) {
    console.warn('Erro ao carregar incomes:', incomesError);
  }

  if (fixedError) {
    console.warn('Erro ao carregar contas fixas:', fixedError);
  }

  state.entries = incomes && incomes.length ? incomes.map(normalizeIncome) : [];
  state.fixedExpenses = fixedExpenses && fixedExpenses.length ? fixedExpenses.map(normalizeFixed) : [];
  saveData();
}

async function loadSettings() {
  if (!supabaseClient) return;

  const [{ data: settings }, { data: creditCards }, { data: accounts }, { data: reserves }] = await Promise.all([
    supabaseClient.from('financial_settings').select('*').maybeSingle(),
    supabaseClient.from('credit_cards').select('*').eq('active', true).order('name'),
    supabaseClient.from('accounts').select('*').eq('active', true).order('name'),
    supabaseClient.from('reserve_plans').select('*').eq('active', true).order('target_month'),
  ]);

  state.settings = settings || null;
  state.creditCards = creditCards || [];
  state.accounts = accounts || [];
  state.reserves = reserves || [];
}

function renderSettings() {
  document.getElementById('salary15').value = state.settings?.salary_15 || '';
  document.getElementById('salary30').value = state.settings?.salary_30 || '';
  document.getElementById('monthlySalary').value = state.settings?.monthly_salary || '';
  els.creditCardsList.innerHTML = state.creditCards.length
    ? state.creditCards.map((card) => `<div class="compact-list-item"><strong>${card.name}</strong><span>Fecha ${card.closing_day || '-'} | vence ${card.due_day || '-'}</span></div>`).join('')
    : '<p class="empty-inline">Nenhum cartão cadastrado.</p>';
  els.accountsList.innerHTML = state.accounts.length
    ? state.accounts.map((account) => `<div class="compact-list-item"><strong>${account.name}</strong><span>${account.account_type}</span></div>`).join('')
    : '<p class="empty-inline">Nenhuma conta cadastrada.</p>';
  els.reservesList.innerHTML = state.reserves.length
    ? state.reserves.map((reserve) => `<div class="compact-list-item"><strong>${reserve.name}</strong><span>Meta ${formatCurrency(reserve.target_amount)} | ${new Date(`${reserve.target_month}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span></div>`).join('')
    : '<p class="empty-inline">Nenhum gasto futuro cadastrado.</p>';
}

async function getCurrentUserId() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user?.id;
}

async function saveSalarySettings(event) {
  event.preventDefault();
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabaseClient.from('financial_settings').upsert({
    user_id: userId,
    salary_15: Number(document.getElementById('salary15').value) || null,
    salary_30: Number(document.getElementById('salary30').value) || null,
    monthly_salary: Number(document.getElementById('monthlySalary').value) || null,
    updated_at: new Date().toISOString(),
  });
  await loadSettings();
  renderSettings();
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

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function getCurrentMonthEntries() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return state.entries.filter((entry) => {
    const date = new Date(entry.date);
    return date.getMonth() === month && date.getFullYear() === year;
  });
}

function renderSummary() {
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

  const monthBalance = monthIncome - monthExpense;
  const creditCardTotal = state.entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + Number(entry.value), 0);

  els.receitaTotal.textContent = formatCurrency(totalIncome);
  els.despesaTotal.textContent = formatCurrency(totalExpense);
  els.saldoTotal.textContent = formatCurrency(totalIncome - totalExpense);
  els.cartaoTotal.textContent = formatCurrency(creditCardTotal);

  els.monthIncome.textContent = formatCurrency(monthIncome);
  els.monthExpense.textContent = formatCurrency(monthExpense);
  els.monthBalance.textContent = formatCurrency(monthBalance);
}

function renderFixedExpenses() {
  if (!state.fixedExpenses.length) {
    els.fixedExpensesList.innerHTML = '<div class="empty-state">Nenhuma conta fixa cadastrada.</div>';
    return;
  }

  els.fixedExpensesList.innerHTML = state.fixedExpenses
    .map(
      (item) => `
        <div class="list-item">
          <div class="meta">
            <span>${item.name}</span>
            <span>Vence dia ${item.dueDay} • ${item.status === 'paid' ? 'Paga' : 'Agendada'}</span>
          </div>
          <strong>${formatCurrency(item.value)}</strong>
        </div>
      `
    )
    .join('');
}

function renderTransactions() {
  if (!state.entries.length) {
    els.transactionsList.innerHTML = '<div class="empty-state">Nenhuma movimentação cadastrada ainda.</div>';
    return;
  }

  const sorted = [...state.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  els.transactionsList.innerHTML = sorted
    .map(
      (entry) => `
        <div class="transaction-item">
          <div>
            <strong>${entry.title}</strong>
            <small>${entry.category} • ${new Date(entry.date).toLocaleDateString('pt-BR')}</small>
          </div>
          <div class="amount ${entry.type === 'income' ? 'income' : 'expense'}">
            ${entry.type === 'income' ? '+' : '-'}${formatCurrency(entry.value)}
          </div>
        </div>
      `
    )
    .join('');
}

async function addMovement(event) {
  event.preventDefault();

  const type = document.getElementById('movementType').value;
  const title = document.getElementById('movementTitle').value.trim();
  const category = document.getElementById('movementCategory').value.trim();
  const value = Number(document.getElementById('movementValue').value);
  const date = document.getElementById('movementDate').value;
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
  const paid = document.getElementById('fixedPaid').checked;

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
      status: paid ? 'paid' : 'scheduled',
      paid_at: paid ? new Date().toISOString().slice(0, 10) : null,
      active: true,
      recurring: true,
      notes: '',
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

  state.fixedExpenses.push({ id: crypto.randomUUID(), name, value, dueDay, status: paid ? 'paid' : 'scheduled' });
  saveData();
  render();
  event.target.reset();
  document.getElementById('fixedDay').value = 5;
}

function render() {
  renderSummary();
  renderFixedExpenses();
  renderTransactions();
}

function initializeFormDefaults() {
  const defaultDate = '2026-01-01';

  document.getElementById('movementDate').value = defaultDate;
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
    initializeFormDefaults();
    render();
    renderSettings();
  }
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
els.salarySettingsForm.addEventListener('submit', saveSalarySettings);
els.cardSettingsForm.addEventListener('submit', addCreditCard);
els.accountSettingsForm.addEventListener('submit', addAccount);
els.reserveSettingsForm.addEventListener('submit', addReservePlan);

document.getElementById('movementType')?.addEventListener('change', syncMovementCategoryPlaceholder);
bindQuickActions();
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
