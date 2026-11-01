<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Estate account — EMAS' })

type Tx = { id: number; type: 'income' | 'expense'; category: string; amount: number; description: string | null; reference: string | null; occurred_at: string; recorded_by_name: string | null; residence_id: number | null }
type Account = {
  summary: { income: number; expenses: number; net: number }
  balance: number
  by_category: { type: string; category: string; total: number }[]
  transactions: Tx[]
}

const { eid, base, can, currency } = useEstate()
const filters = reactive({ type: '', from: '', to: '' })
const qs = computed(() => {
  const p = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][])
  return p.toString() ? `?${p}` : ''
})
const { data: acct, refresh } = await useApi<Account>(() => `/estates/${eid.value}/account${qs.value}`)
const m = (v: number) => money(v, currency.value)

const showForm = ref(false)
const form = reactive({ type: 'expense', category: '', amount: '', description: '', reference: '', occurred_at: '' })
const CATEGORIES = { income: ['Levy', 'Donation', 'Rental income', 'Other income'], expense: ['Security', 'Cleaning', 'Electricity', 'Water', 'Repairs & maintenance', 'Staff salaries', 'Admin', 'Other expense'] }
const { pending, error, run } = useAction()

async function create() {
  await run(async () => {
    await apiCall('POST', `/estates/${eid.value}/account`, {
      type: form.type,
      category: form.category,
      amount: toMinor(form.amount),
      description: form.description || null,
      reference: form.reference || null,
      ...(form.occurred_at ? { occurred_at: form.occurred_at } : {}),
    })
    Object.assign(form, { type: 'expense', category: '', amount: '', description: '', reference: '', occurred_at: '' })
    showForm.value = false
    await refresh()
  })
}

async function remove(t: Tx) {
  if (!confirm('Delete this transaction?')) return
  await run(async () => { await apiCall('DELETE', `/estates/${eid.value}/account/${t.id}`); await refresh() })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Estate account</h1>
        <p class="muted">Income and expenses. Residence payments are recorded here automatically.</p>
      </div>
      <button v-if="can('estate_accounts.manage')" class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'Record transaction' }}</button>
    </div>
    <FormError :error="error" />

    <form v-if="showForm" class="card card-body form" @submit.prevent="create">
      <div class="form-grid">
        <label>Type
          <select v-model="form.type"><option value="expense">Expense</option><option value="income">Income</option></select>
        </label>
        <label>Category
          <input v-model="form.category" list="categories" required />
          <datalist id="categories"><option v-for="c in CATEGORIES[form.type as 'income' | 'expense']" :key="c" :value="c" /></datalist>
        </label>
        <label>Amount ({{ currency }}) <input v-model="form.amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Date <input v-model="form.occurred_at" type="date" /></label>
      </div>
      <div class="form-grid">
        <label>Description <input v-model="form.description" /></label>
        <label>Reference <input v-model="form.reference" /></label>
      </div>
      <div class="actions"><button class="btn primary" :disabled="pending">Save</button></div>
    </form>

    <div v-if="acct" class="grid">
      <div class="card stat"><div class="label">Balance (all time)</div><div class="value" :class="acct.balance < 0 ? 'neg' : ''">{{ m(acct.balance) }}</div></div>
      <div class="card stat"><div class="label">Income{{ filters.from || filters.to ? ' (filtered)' : '' }}</div><div class="value pos">{{ m(acct.summary.income) }}</div></div>
      <div class="card stat"><div class="label">Expenses{{ filters.from || filters.to ? ' (filtered)' : '' }}</div><div class="value neg">{{ m(acct.summary.expenses) }}</div></div>
      <div class="card stat"><div class="label">Net</div><div class="value">{{ m(acct.summary.net) }}</div></div>
    </div>

    <div class="grid-2" style="grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr)">
      <div class="card">
        <div class="card-head">
          <div class="row">
            <select v-model="filters.type" style="width: auto"><option value="">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select>
            <input v-model="filters.from" type="date" style="width: auto" aria-label="From" />
            <input v-model="filters.to" type="date" style="width: auto" aria-label="To" />
          </div>
        </div>
        <div class="table-wrap">
          <table v-if="acct?.transactions.length">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th /></tr></thead>
            <tbody>
              <tr v-for="t in acct.transactions" :key="t.id">
                <td class="muted">{{ date(t.occurred_at) }}</td>
                <td>{{ t.category }}</td>
                <td>
                  <NuxtLink v-if="t.residence_id" :to="`${base}/residences/${t.residence_id}?tab=account`">{{ t.description }}</NuxtLink>
                  <template v-else>{{ t.description || '—' }}</template>
                  <div v-if="t.reference" class="small muted">Ref {{ t.reference }}</div>
                </td>
                <td class="num" :class="t.type === 'income' ? 'pos' : 'neg'">{{ t.type === 'income' ? '+' : '−' }}{{ m(t.amount) }}</td>
                <td><button v-if="can('estate_accounts.manage') && !t.residence_id" class="btn sm danger" @click="remove(t)">Delete</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">No transactions.</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>By category</h2></div>
        <table v-if="acct?.by_category.length">
          <tbody>
            <tr v-for="c in acct.by_category" :key="c.type + c.category">
              <td>{{ c.category }}<div class="small muted">{{ c.type }}</div></td>
              <td class="num" :class="c.type === 'income' ? 'pos' : 'neg'">{{ m(c.total) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">Nothing yet.</div>
      </div>
    </div>
  </div>
</template>
