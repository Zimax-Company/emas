<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Dues — EMAS' })

type Due = {
  id: number; title: string; description: string | null; amount: number; frequency: string; due_date: string | null
  status: 'active' | 'archived'; charge_count: number; charged_total: number; current_period: string
}

const { eid, can, currency } = useEstate()
const { data: dues, refresh } = await useApi<Due[]>(() => `/estates/${eid.value}/dues`)
const m = (v: number) => money(v, currency.value)

const showForm = ref(false)
const form = reactive({ title: '', description: '', amount: '', frequency: 'monthly', due_date: '' })
const notice = ref<string | null>(null)
const { pending, error, run } = useAction()

async function create() {
  await run(async () => {
    await apiCall('POST', `/estates/${eid.value}/dues`, {
      title: form.title,
      description: form.description || null,
      amount: toMinor(form.amount),
      frequency: form.frequency,
      due_date: form.due_date || null,
    })
    Object.assign(form, { title: '', description: '', amount: '', frequency: 'monthly', due_date: '' })
    showForm.value = false
    await refresh()
  })
}

async function charge(d: Due) {
  const period = d.frequency === 'one_time' ? 'once' : prompt(`Charge "${d.title}" to every residence for period:`, d.current_period)
  if (!period) return
  await run(async () => {
    const res = await apiCall<{ charged: number; skipped: number; period: string }>('POST', `/estates/${eid.value}/dues/${d.id}/charge`, { period })
    notice.value = `${d.title} (${res.period}): charged ${res.charged} residence(s)${res.skipped ? `, ${res.skipped} already charged` : ''}.`
    await refresh()
  })
}

async function setStatus(d: Due, status: Due['status']) {
  await run(async () => { await apiCall('PATCH', `/estates/${eid.value}/dues/${d.id}`, { status }); await refresh() })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Dues</h1>
        <p class="muted">Charging a due posts it to every residence account for the billing period.</p>
      </div>
      <button v-if="can('dues.manage')" class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'New due' }}</button>
    </div>
    <FormError :error="error" />
    <div v-if="notice" class="alert success">{{ notice }}</div>

    <form v-if="showForm" class="card card-body form" @submit.prevent="create">
      <div class="form-grid">
        <label>Title <input v-model="form.title" placeholder="e.g. Service charge" required /></label>
        <label>Amount ({{ currency }}) <input v-model="form.amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Frequency
          <select v-model="form.frequency">
            <option v-for="(label, key) in FREQUENCY_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label>Due date <input v-model="form.due_date" type="date" /></label>
      </div>
      <label>Description <textarea v-model="form.description" rows="2" /></label>
      <div class="actions"><button class="btn primary" :disabled="pending">Create due</button></div>
    </form>

    <div class="card">
      <div class="table-wrap">
        <table v-if="dues?.length">
          <thead><tr><th>Due</th><th>Frequency</th><th class="num">Amount</th><th class="num">Charged to date</th><th>Status</th><th /></tr></thead>
          <tbody>
            <tr v-for="d in dues" :key="d.id">
              <td>{{ d.title }}<div v-if="d.description" class="small muted">{{ d.description }}</div><div v-if="d.due_date" class="small muted">Due {{ date(d.due_date) }}</div></td>
              <td>{{ FREQUENCY_LABELS[d.frequency] }}</td>
              <td class="num">{{ m(d.amount) }}</td>
              <td class="num">{{ m(d.charged_total) }}<div class="small muted">{{ d.charge_count }} charge(s)</div></td>
              <td><span class="badge" :class="d.status === 'active' ? 'success' : ''">{{ d.status }}</span></td>
              <td class="actions">
                <template v-if="can('dues.manage')">
                  <button v-if="d.status === 'active'" class="btn sm primary" @click="charge(d)">Charge residences</button>
                  <button class="btn sm" @click="setStatus(d, d.status === 'active' ? 'archived' : 'active')">{{ d.status === 'active' ? 'Archive' : 'Restore' }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No dues yet.</div>
      </div>
    </div>
  </div>
</template>
