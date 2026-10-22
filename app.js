const STORAGE_KEY = 'contas-pessoais';

const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG || {};
const supabaseClient = supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

const state = {
  entries: [],
  fixedExpenses: [],
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
    initializeFormDefaults();
    render();
  }
}

function bindQuickActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const map = {
        income: () => document.getElementById('movementTitle').focus(),
        card: () => document.getElementById('movementTitle').focus(),
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

document.getElementById('movementType')?.addEventListener('change', syncMovementCategoryPlaceholder);
bindQuickActions();
readLocalData();
initializeFormDefaults();
render();

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
