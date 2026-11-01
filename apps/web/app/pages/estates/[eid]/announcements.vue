<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Announcements — EMAS' })

type Announcement = { id: number; title: string; body: string; audience: string; published_at: string; author_name: string | null; recipients: number; read_count: number }

const { eid, can } = useEstate()
const { data: list, refresh } = await useApi<Announcement[]>(() => `/estates/${eid.value}/announcements`)
const { data: residences } = await useApi<{ id: number; name: string }[]>(() => `/estates/${eid.value}/residences`, {
  immediate: can('announcements.publish'),
})

const form = reactive({ title: '', body: '', audience: 'all' as 'all' | 'selected', residence_ids: [] as number[] })
const showForm = ref(false)
const sent = ref<number | null>(null)
const { pending, error, run } = useAction()

async function publish() {
  await run(async () => {
    const res = await apiCall<{ recipients: number }>('POST', `/estates/${eid.value}/announcements`, form)
    sent.value = res.recipients
    Object.assign(form, { title: '', body: '', audience: 'all', residence_ids: [] })
    showForm.value = false
    await refresh()
  })
}

async function retract(a: Announcement) {
  if (!confirm(`Retract "${a.title}" from every inbox?`)) return
  await run(async () => { await apiCall('DELETE', `/estates/${eid.value}/announcements/${a.id}`); await refresh() })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Announcements</h1>
        <p class="muted">Published announcements land in each residence's inbox.</p>
      </div>
      <button v-if="can('announcements.publish')" class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'New announcement' }}</button>
    </div>
    <FormError :error="error" />
    <div v-if="sent !== null" class="alert success">Announcement delivered to {{ sent }} residence inbox(es).</div>

    <form v-if="showForm" class="card card-body form" @submit.prevent="publish">
      <label>Title <input v-model="form.title" required /></label>
      <label>Message <textarea v-model="form.body" rows="6" required /></label>
      <div class="row">
        <label class="check"><input v-model="form.audience" type="radio" value="all" /> All residences</label>
        <label class="check"><input v-model="form.audience" type="radio" value="selected" /> Selected residences</label>
      </div>
      <div v-if="form.audience === 'selected'" class="card card-body" style="max-height: 220px; overflow: auto; box-shadow: none">
        <label v-for="r in residences" :key="r.id" class="check"><input v-model="form.residence_ids" type="checkbox" :value="r.id" /> {{ r.name }}</label>
        <p v-if="!residences?.length" class="muted">No residences yet.</p>
      </div>
      <div class="actions"><button class="btn primary" :disabled="pending">Publish</button></div>
    </form>

    <div class="card">
      <div v-if="!list?.length" class="empty">No announcements yet.</div>
      <div v-for="a in list" :key="a.id" class="message">
        <div class="row between">
          <h3>{{ a.title }}</h3>
          <div class="row">
            <span class="small muted">{{ date(a.published_at, true) }}</span>
            <button v-if="can('announcements.publish')" class="btn sm danger" @click="retract(a)">Retract</button>
          </div>
        </div>
        <div class="small muted">
          By {{ a.author_name || '—' }} · {{ a.audience === 'all' ? 'All residences' : 'Selected residences' }} ·
          read by {{ a.read_count }}/{{ a.recipients }}
        </div>
        <div class="body">{{ a.body }}</div>
      </div>
    </div>
  </div>
</template>
