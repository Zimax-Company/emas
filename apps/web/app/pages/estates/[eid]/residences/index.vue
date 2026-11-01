<script setup lang="ts">
definePageMeta({ layout: 'estate' })

type Residence = {
  id: number; name: string; address_line1: string; address_line2: string | null; city: string | null
  primary_contact_name: string | null; primary_contact_phone: string | null; balance: number | null
}

const { eid, base, can, currency } = useEstate()
const q = ref('')
const { data: residences, refresh } = await useApi<Residence[]>(
  () => `/estates/${eid.value}/residences${q.value ? `?q=${encodeURIComponent(q.value)}` : ''}`,
)
useHead({ title: 'Residences — EMAS' })

const showForm = ref(false)
const blank = () => ({ name: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', contact_name: '', contact_phone: '', contact_email: '' })
const form = reactive(blank())
const { pending, error, run } = useAction()

async function create() {
  await run(async () => {
    const { contact_name, contact_phone, contact_email, ...residence } = form
    await apiCall('POST', `/estates/${eid.value}/residences`, {
      ...residence,
      contacts: contact_name
        ? [{ name: contact_name, phone: contact_phone || null, email: contact_email || null, relationship: 'owner', is_primary: true }]
        : [],
    })
    Object.assign(form, blank())
    showForm.value = false
    await refresh()
  })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>{{ can('residences.view') ? 'Residences' : 'My residence' }}</h1>
        <p class="muted">{{ residences?.length ?? 0 }} residence(s)</p>
      </div>
      <button v-if="can('residences.manage')" class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'Add residence' }}</button>
    </div>

    <form v-if="showForm" class="card card-body form" @submit.prevent="create">
      <FormError :error="error" />
      <div class="form-grid">
        <label>Name <input v-model="form.name" placeholder="e.g. Block A, Flat 3" required /></label>
        <label>Address line 1 <input v-model="form.address_line1" required /></label>
        <label>Address line 2 <input v-model="form.address_line2" /></label>
        <label>City <input v-model="form.city" /></label>
        <label>State <input v-model="form.state" /></label>
        <label>Postal code <input v-model="form.postal_code" /></label>
      </div>
      <h3>Primary contact <span class="muted small">(optional)</span></h3>
      <div class="form-grid">
        <label>Name <input v-model="form.contact_name" /></label>
        <label>Phone <input v-model="form.contact_phone" /></label>
        <label>Email <input v-model="form.contact_email" type="email" /></label>
      </div>
      <div class="actions"><button class="btn primary" :disabled="pending">Save residence</button></div>
    </form>

    <div class="card">
      <div v-if="can('residences.view')" class="card-head">
        <input v-model="q" placeholder="Search name or address" style="max-width: 320px" @keyup.enter="refresh()" />
      </div>
      <div class="table-wrap">
        <table v-if="residences?.length">
          <thead><tr><th>Residence</th><th>Address</th><th>Primary contact</th><th class="num">Balance owed</th></tr></thead>
          <tbody>
            <tr v-for="r in residences" :key="r.id">
              <td><NuxtLink :to="`${base}/residences/${r.id}`">{{ r.name }}</NuxtLink></td>
              <td>{{ r.address_line1 }}<span v-if="r.city" class="muted">, {{ r.city }}</span></td>
              <td>{{ r.primary_contact_name ?? '—' }}<div v-if="r.primary_contact_phone" class="small muted">{{ r.primary_contact_phone }}</div></td>
              <td class="num" :class="(r.balance ?? 0) > 0 ? 'neg' : ''">{{ r.balance === null ? '—' : money(r.balance, currency) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No residences yet.</div>
      </div>
    </div>
  </div>
</template>
