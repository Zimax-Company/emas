<script setup lang="ts">
definePageMeta({ layout: 'estate' })

type Contact = { id: number; name: string; phone: string | null; email: string | null; relationship: string; is_primary: boolean }
type Residence = {
  id: number; name: string; address_line1: string; address_line2: string | null; city: string | null; state: string | null; postal_code: string | null
  contacts: Contact[]
  residents: { id: number; name: string; email: string; phone: string | null }[]
  unread_count: number
  account: { charged: number; paid: number; balance: number } | null
  access: { is_resident: boolean; can_manage: boolean; can_manage_account: boolean }
}
type Message = { id: number; read_at: string | null; title: string; body: string; published_at: string; author_name: string | null }
type Ledger = {
  summary: { charged: number; paid: number; balance: number }
  transactions: { id: number; type: string; amount: number; description: string | null; period: string | null; reference: string | null; occurred_at: string; due_title: string | null; recorded_by_name: string | null }[]
}

const route = useRoute()
const { eid, base, can, currency } = useEstate()
const rid = computed(() => String(route.params.rid))
const path = computed(() => `/estates/${eid.value}/residences/${rid.value}`)
const tab = computed(() => (typeof route.query.tab === 'string' ? route.query.tab : 'overview'))

const { data: r, refresh } = await useApi<Residence>(() => path.value)
useHead(() => ({ title: `${r.value?.name ?? 'Residence'} — EMAS` }))

const canSeeInbox = computed(() => r.value?.access.is_resident || can('announcements.view'))
const canSeeAccount = computed(() => r.value?.account !== null)

const { data: inbox, refresh: refreshInbox } = await useApi<Message[]>(() => `${path.value}/inbox`, {
  immediate: tab.value === 'inbox', watch: false,
})
const { data: ledger, refresh: refreshLedger } = await useApi<Ledger>(() => `${path.value}/transactions`, {
  immediate: tab.value === 'account', watch: false,
})
watch(tab, (t) => {
  if (t === 'inbox') refreshInbox()
  if (t === 'account') refreshLedger()
})

const m = (v: number | undefined) => money(v, currency.value)
const { pending, error, run } = useAction()

// Edit details
const editing = ref(false)
const details = reactive({ name: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '' })
function startEdit() {
  Object.assign(details, {
    name: r.value!.name, address_line1: r.value!.address_line1, address_line2: r.value!.address_line2 ?? '',
    city: r.value!.city ?? '', state: r.value!.state ?? '', postal_code: r.value!.postal_code ?? '',
  })
  editing.value = true
}
async function saveDetails() {
  await run(async () => {
    await apiCall('PATCH', path.value, details)
    editing.value = false
    await refresh()
  })
}
async function removeResidence() {
  if (!confirm(`Delete ${r.value?.name}? Its contacts, inbox and account history will be removed.`)) return
  await run(async () => {
    await apiCall('DELETE', path.value)
    await navigateTo(`${base.value}/residences`)
  })
}

// Contacts
const contact = reactive({ name: '', phone: '', email: '', relationship: 'owner', is_primary: false })
async function addContact() {
  await run(async () => {
    await apiCall('POST', `${path.value}/contacts`, { ...contact, phone: contact.phone || null, email: contact.email || null })
    Object.assign(contact, { name: '', phone: '', email: '', relationship: 'owner', is_primary: false })
    await refresh()
  })
}
async function makePrimary(c: Contact) {
  await run(async () => { await apiCall('PATCH', `${path.value}/contacts/${c.id}`, { is_primary: true }); await refresh() })
}
async function removeContact(c: Contact) {
  if (!confirm(`Remove ${c.name}?`)) return
  await run(async () => { await apiCall('DELETE', `${path.value}/contacts/${c.id}`); await refresh() })
}

// Residents (user accounts)
const resident = reactive({ name: '', email: '' })
const tempPassword = ref<string | null>(null)
async function addResident() {
  await run(async () => {
    const res = await apiCall<{ temporary_password: string | null }>('POST', `${path.value}/residents`, resident)
    tempPassword.value = res.temporary_password
    Object.assign(resident, { name: '', email: '' })
    await refresh()
  })
}
async function removeResident(id: number) {
  if (!confirm('Unlink this resident from the residence?')) return
  await run(async () => { await apiCall('DELETE', `${path.value}/residents/${id}`); await refresh() })
}

// Inbox
async function markRead(msg: Message) {
  if (msg.read_at || !r.value?.access.is_resident) return
  await apiCall('PATCH', `${path.value}/inbox/${msg.id}`)
  msg.read_at = new Date().toISOString()
  if (r.value) r.value.unread_count = Math.max(0, r.value.unread_count - 1)
}

// Account
const tx = reactive({ type: 'payment', amount: '', description: '', reference: '', occurred_at: '' })
async function recordTx() {
  await run(async () => {
    await apiCall('POST', `${path.value}/transactions`, {
      type: tx.type,
      amount: toMinor(tx.amount),
      description: tx.description || null,
      reference: tx.reference || null,
      ...(tx.occurred_at ? { occurred_at: tx.occurred_at } : {}),
    })
    Object.assign(tx, { type: 'payment', amount: '', description: '', reference: '', occurred_at: '' })
    await Promise.all([refreshLedger(), refresh()])
  })
}
</script>

<template>
  <div v-if="r" class="stack">
    <div class="page-head">
      <div>
        <p class="small"><NuxtLink :to="`${base}/residences`">← Residences</NuxtLink></p>
        <h1>{{ r.name }}</h1>
        <p class="muted">{{ [r.address_line1, r.address_line2, r.city, r.state, r.postal_code].filter(Boolean).join(', ') }}</p>
      </div>
      <div v-if="r.account" class="card stat" style="min-width: 200px">
        <div class="label">Balance owed</div>
        <div class="value" :class="r.account.balance > 0 ? 'neg' : 'pos'">{{ m(r.account.balance) }}</div>
      </div>
    </div>

    <nav class="tabs">
      <NuxtLink :to="{ query: {} }" :class="{ active: tab === 'overview' }">Overview</NuxtLink>
      <NuxtLink v-if="canSeeInbox" :to="{ query: { tab: 'inbox' } }" :class="{ active: tab === 'inbox' }">
        Inbox <span v-if="r.unread_count" class="badge primary">{{ r.unread_count }}</span>
      </NuxtLink>
      <NuxtLink v-if="canSeeAccount" :to="{ query: { tab: 'account' } }" :class="{ active: tab === 'account' }">Account</NuxtLink>
    </nav>
    <FormError :error="error" />

    <!-- Overview -->
    <template v-if="tab === 'overview'">
      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <h2>Details</h2>
            <div v-if="r.access.can_manage" class="row">
              <button v-if="!editing" class="btn sm" @click="startEdit">Edit</button>
              <button class="btn sm danger" @click="removeResidence">Delete</button>
            </div>
          </div>
          <form v-if="editing" class="card-body form" @submit.prevent="saveDetails">
            <label>Name <input v-model="details.name" required /></label>
            <label>Address line 1 <input v-model="details.address_line1" required /></label>
            <label>Address line 2 <input v-model="details.address_line2" /></label>
            <div class="form-grid">
              <label>City <input v-model="details.city" /></label>
              <label>State <input v-model="details.state" /></label>
              <label>Postal code <input v-model="details.postal_code" /></label>
            </div>
            <div class="actions"><button type="button" class="btn" @click="editing = false">Cancel</button><button class="btn primary" :disabled="pending">Save</button></div>
          </form>
          <table v-else>
            <tbody>
              <tr><th style="width: 140px">Name</th><td>{{ r.name }}</td></tr>
              <tr><th>Address</th><td>{{ r.address_line1 }}<br v-if="r.address_line2" />{{ r.address_line2 }}</td></tr>
              <tr><th>City / State</th><td>{{ [r.city, r.state].filter(Boolean).join(', ') || '—' }}</td></tr>
              <tr><th>Postal code</th><td>{{ r.postal_code || '—' }}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-head"><h2>Residents</h2><span class="small muted">Accounts with access to this residence</span></div>
          <table v-if="r.residents.length">
            <tbody>
              <tr v-for="u in r.residents" :key="u.id">
                <td>{{ u.name }}<div class="small muted">{{ u.email }}</div></td>
                <td class="num"><button v-if="r.access.can_manage" class="btn sm danger" @click="removeResident(u.id)">Unlink</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">No resident accounts linked.</div>
          <form v-if="r.access.can_manage && can('members.manage')" class="card-body form" style="border-top: 1px solid var(--border)" @submit.prevent="addResident">
            <div v-if="tempPassword" class="alert success">Account created. Temporary password: <code>{{ tempPassword }}</code></div>
            <div class="form-grid">
              <input v-model="resident.name" placeholder="Name" required />
              <input v-model="resident.email" type="email" placeholder="Email" required />
            </div>
            <div class="actions"><button class="btn sm primary" :disabled="pending">Add resident</button></div>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h2>Contacts</h2></div>
        <div class="table-wrap">
          <table v-if="r.contacts.length">
            <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th /></tr></thead>
            <tbody>
              <tr v-for="c in r.contacts" :key="c.id">
                <td>{{ c.name }} <span v-if="c.is_primary" class="badge primary">Primary</span></td>
                <td style="text-transform: capitalize">{{ c.relationship }}</td>
                <td>{{ c.phone || '—' }}</td>
                <td>{{ c.email || '—' }}</td>
                <td class="actions">
                  <template v-if="r.access.can_manage">
                    <button v-if="!c.is_primary" class="btn sm" @click="makePrimary(c)">Make primary</button>
                    <button class="btn sm danger" @click="removeContact(c)">Remove</button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">No contacts yet.</div>
        </div>
        <form v-if="r.access.can_manage" class="card-body form" style="border-top: 1px solid var(--border)" @submit.prevent="addContact">
          <div class="form-grid">
            <input v-model="contact.name" placeholder="Name" required />
            <input v-model="contact.phone" placeholder="Phone" />
            <input v-model="contact.email" type="email" placeholder="Email" />
            <select v-model="contact.relationship">
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
              <option value="family">Family</option>
              <option value="emergency">Emergency</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="row between">
            <label class="check"><input v-model="contact.is_primary" type="checkbox" /> Primary contact</label>
            <button class="btn sm primary" :disabled="pending">Add contact</button>
          </div>
        </form>
      </div>
    </template>

    <!-- Inbox -->
    <div v-else-if="tab === 'inbox'" class="card">
      <div v-if="!inbox?.length" class="empty">The inbox is empty.</div>
      <div
        v-for="msg in inbox"
        :key="msg.id"
        class="message"
        :class="{ unread: !msg.read_at }"
        @click="markRead(msg)"
      >
        <div class="row between">
          <h3>{{ msg.title }}</h3>
          <span class="small muted">{{ date(msg.published_at, true) }}</span>
        </div>
        <div class="small muted">From {{ msg.author_name || 'Estate management' }}<span v-if="!msg.read_at && r.access.is_resident"> · click to mark as read</span></div>
        <div class="body">{{ msg.body }}</div>
      </div>
    </div>

    <!-- Account -->
    <template v-else-if="tab === 'account' && ledger">
      <div class="grid">
        <div class="card stat"><div class="label">Total charged</div><div class="value">{{ m(ledger.summary.charged) }}</div></div>
        <div class="card stat"><div class="label">Total paid &amp; credited</div><div class="value pos">{{ m(ledger.summary.paid) }}</div></div>
        <div class="card stat"><div class="label">Balance owed</div><div class="value" :class="ledger.summary.balance > 0 ? 'neg' : 'pos'">{{ m(ledger.summary.balance) }}</div></div>
      </div>

      <form v-if="r.access.can_manage_account" class="card card-body form" @submit.prevent="recordTx">
        <h2>Record transaction</h2>
        <div class="form-grid">
          <label>Type
            <select v-model="tx.type">
              <option value="payment">Payment (adds estate income)</option>
              <option value="credit">Credit / waiver</option>
              <option value="charge">Manual charge</option>
            </select>
          </label>
          <label>Amount ({{ currency }}) <input v-model="tx.amount" type="number" min="0.01" step="0.01" required /></label>
          <label>Date <input v-model="tx.occurred_at" type="date" /></label>
          <label>Reference <input v-model="tx.reference" placeholder="Receipt / transfer ref" /></label>
        </div>
        <label>Description <input v-model="tx.description" /></label>
        <div class="actions"><button class="btn primary" :disabled="pending">Record</button></div>
      </form>

      <div class="card">
        <div class="card-head"><h2>Transactions</h2></div>
        <div class="table-wrap">
          <table v-if="ledger.transactions.length">
            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Reference</th><th class="num">Amount</th></tr></thead>
            <tbody>
              <tr v-for="t in ledger.transactions" :key="t.id">
                <td class="muted">{{ date(t.occurred_at) }}</td>
                <td>{{ t.description || t.due_title || '—' }}<div v-if="t.recorded_by_name" class="small muted">by {{ t.recorded_by_name }}</div></td>
                <td><span class="badge" :class="t.type === 'charge' ? 'warning' : 'success'">{{ t.type }}</span></td>
                <td class="muted">{{ t.reference || '—' }}</td>
                <td class="num" :class="t.type === 'charge' ? 'neg' : 'pos'">{{ t.type === 'charge' ? '' : '−' }}{{ m(t.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">No transactions yet.</div>
        </div>
      </div>
    </template>
  </div>
</template>
