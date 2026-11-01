<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Estate settings — EMAS' })

const { eid, data, refresh, can } = useEstate()
const session = useSession()
const form = reactive({ name: data.value?.estate.name ?? '', address: data.value?.estate.address ?? '', currency: data.value?.estate.currency ?? 'NGN' })
const saved = ref(false)
const { pending, error, run } = useAction()

async function save() {
  saved.value = false
  await run(async () => {
    await apiCall('PATCH', `/estates/${eid.value}`, form)
    await Promise.all([refresh(), session.refresh()])
    saved.value = true
  })
}

async function destroy() {
  if (prompt(`Type the estate name to permanently delete it:`) !== data.value?.estate.name) return
  await run(async () => {
    await apiCall('DELETE', `/estates/${eid.value}`)
    await session.refresh()
    await navigateTo('/')
  })
}
</script>

<template>
  <div class="stack" style="max-width: 640px">
    <div class="page-head"><h1>Estate settings</h1></div>
    <Forbidden v-if="!can('estate.update')" />
    <template v-else>
      <form class="card card-body form" @submit.prevent="save">
        <FormError :error="error" />
        <div v-if="saved" class="alert success">Saved.</div>
        <label>Name <input v-model="form.name" required minlength="2" /></label>
        <label>Address <textarea v-model="form.address" rows="2" /></label>
        <label style="max-width: 160px">Currency <input v-model="form.currency" maxlength="3" required /></label>
        <div class="actions"><button class="btn primary" :disabled="pending">Save</button></div>
      </form>
      <div v-if="session.user.value?.is_system_admin" class="card card-body form">
        <h2>Danger zone</h2>
        <p class="muted">Deleting an estate removes its residences, accounts, announcements and memberships.</p>
        <div class="actions"><button class="btn danger" @click="destroy">Delete estate</button></div>
      </div>
    </template>
  </div>
</template>
