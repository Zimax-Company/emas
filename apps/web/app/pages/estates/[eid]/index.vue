<script setup lang="ts">
definePageMeta({ layout: 'estate' })

type Dashboard = {
  estate: { id: number; name: string; currency: string }
  residence_count?: number
  member_count?: number
  finance?: {
    this_month: { income: number; expenses: number; net: number }
    balance: number
    recent_transactions: { id: number; type: string; category: string; amount: number; description: string | null; occurred_at: string }[]
  }
  receivables?: { outstanding_total: number; residences_owing: number; top_owing: { id: number; name: string; balance: number }[] }
  recent_announcements?: { id: number; title: string; published_at: string }[]
  active_dues?: { id: number; title: string; amount: number; frequency: string; due_date: string | null }[]
  my_residences?: { id: number; name: string; address_line1: string; unread_count: number; account: { balance: number } }[]
}

const { eid, base, currency } = useEstate()
const { data: d } = await useApi<Dashboard>(() => `/estates/${eid.value}/dashboard`)
useHead(() => ({ title: `${d.value?.estate.name ?? 'Dashboard'} — EMAS` }))
const m = (v: number | undefined) => money(v, currency.value)
</script>

<template>
  <div v-if="d" class="stack">
    <div class="page-head">
      <div>
        <h1>{{ d.estate.name }}</h1>
        <p class="muted">Estate dashboard</p>
      </div>
    </div>

    <!-- Resident view -->
    <section v-if="d.my_residences?.length" class="stack">
      <h2>My residence</h2>
      <div class="grid">
        <NuxtLink v-for="r in d.my_residences" :key="r.id" :to="`${base}/residences/${r.id}`" class="card card-body" style="color: inherit; text-decoration: none">
          <div class="row between">
            <h3>{{ r.name }}</h3>
            <span v-if="r.unread_count" class="badge primary">{{ r.unread_count }} unread</span>
          </div>
          <p class="muted small">{{ r.address_line1 }}</p>
          <p style="margin-top: 10px">
            <span class="muted small">Balance owed</span><br />
            <b :class="r.account.balance > 0 ? 'neg' : 'pos'">{{ m(r.account.balance) }}</b>
          </p>
        </NuxtLink>
      </div>
    </section>

    <!-- Admin stats -->
    <div v-if="d.residence_count !== undefined || d.finance || d.receivables" class="grid">
      <div v-if="d.residence_count !== undefined" class="card stat"><div class="label">Residences</div><div class="value">{{ d.residence_count }}</div></div>
      <div v-if="d.member_count !== undefined" class="card stat"><div class="label">Members</div><div class="value">{{ d.member_count }}</div></div>
      <div v-if="d.finance" class="card stat"><div class="label">Estate balance</div><div class="value" :class="d.finance.balance < 0 ? 'neg' : ''">{{ m(d.finance.balance) }}</div></div>
      <div v-if="d.finance" class="card stat"><div class="label">Income this month</div><div class="value pos">{{ m(d.finance.this_month.income) }}</div></div>
      <div v-if="d.finance" class="card stat"><div class="label">Expenses this month</div><div class="value neg">{{ m(d.finance.this_month.expenses) }}</div></div>
      <div v-if="d.receivables" class="card stat">
        <div class="label">Outstanding dues</div>
        <div class="value">{{ m(d.receivables.outstanding_total) }}</div>
        <div class="small muted">{{ d.receivables.residences_owing }} residence(s) owing</div>
      </div>
    </div>

    <div class="grid-2">
      <div v-if="d.receivables" class="card">
        <div class="card-head"><h2>Top balances owed</h2><NuxtLink :to="`${base}/residences`" class="small">All residences</NuxtLink></div>
        <table v-if="d.receivables.top_owing.length">
          <tbody>
            <tr v-for="r in d.receivables.top_owing" :key="r.id">
              <td><NuxtLink :to="`${base}/residences/${r.id}`">{{ r.name }}</NuxtLink></td>
              <td class="num neg">{{ m(r.balance) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">Nobody owes anything. 🎉</div>
      </div>

      <div v-if="d.finance" class="card">
        <div class="card-head"><h2>Recent transactions</h2><NuxtLink :to="`${base}/account`" class="small">Estate account</NuxtLink></div>
        <table v-if="d.finance.recent_transactions.length">
          <tbody>
            <tr v-for="t in d.finance.recent_transactions" :key="t.id">
              <td>{{ t.category }}<div class="small muted">{{ date(t.occurred_at) }}</div></td>
              <td class="num" :class="t.type === 'income' ? 'pos' : 'neg'">{{ t.type === 'income' ? '+' : '−' }}{{ m(t.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No transactions yet.</div>
      </div>

      <div v-if="d.recent_announcements" class="card">
        <div class="card-head"><h2>Recent announcements</h2><NuxtLink :to="`${base}/announcements`" class="small">All</NuxtLink></div>
        <table v-if="d.recent_announcements.length">
          <tbody>
            <tr v-for="a in d.recent_announcements" :key="a.id"><td>{{ a.title }}</td><td class="num muted">{{ date(a.published_at) }}</td></tr>
          </tbody>
        </table>
        <div v-else class="empty">No announcements yet.</div>
      </div>

      <div v-if="d.active_dues" class="card">
        <div class="card-head"><h2>Active dues</h2><NuxtLink :to="`${base}/dues`" class="small">All dues</NuxtLink></div>
        <table v-if="d.active_dues.length">
          <tbody>
            <tr v-for="due in d.active_dues" :key="due.id">
              <td>{{ due.title }}<div class="small muted">{{ FREQUENCY_LABELS[due.frequency] }}</div></td>
              <td class="num">{{ m(due.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No active dues.</div>
      </div>
    </div>
  </div>
</template>
