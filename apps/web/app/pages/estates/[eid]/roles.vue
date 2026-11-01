<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Roles & permissions — EMAS' })

type Role = { id: number; name: string; slug: string; description: string | null; is_default: boolean; is_admin: boolean; member_count: number; permissions: string[] }
type Permission = { key: string; group: string; label: string }

const { eid, can, data: estate } = useEstate()
const { data: roles, refresh } = await useApi<Role[]>(() => `/estates/${eid.value}/roles`)
const { data: catalog } = await useApi<Permission[]>('/permissions')
const groups = computed(() => {
  const g: Record<string, Permission[]> = {}
  for (const p of catalog.value ?? []) (g[p.group] ??= []).push(p)
  return g
})
const manage = computed(() => can('roles.manage'))
// Non-admins can only grant permissions they hold.
const grantable = (key: string) => estate.value?.access.is_admin || can(key)

const editing = ref<number | 'new' | null>(null)
const form = reactive({ name: '', description: '', permissions: [] as string[] })
const { pending, error, run } = useAction()

function edit(role?: Role) {
  editing.value = role ? role.id : 'new'
  Object.assign(form, { name: role?.name ?? '', description: role?.description ?? '', permissions: [...(role?.permissions ?? ['estate.view'])] })
}

async function save() {
  await run(async () => {
    const body = { name: form.name, description: form.description || null, permissions: form.permissions }
    if (editing.value === 'new') await apiCall('POST', `/estates/${eid.value}/roles`, body)
    else await apiCall('PATCH', `/estates/${eid.value}/roles/${editing.value}`, body)
    editing.value = null
    await refresh()
  })
}

async function remove(role: Role) {
  if (!confirm(`Delete role "${role.name}"? Members keep their other roles.`)) return
  await run(async () => { await apiCall('DELETE', `/estates/${eid.value}/roles/${role.id}`); await refresh() })
}

const labelFor = (key: string) => catalog.value?.find((p) => p.key === key)?.label ?? key
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Roles &amp; permissions</h1>
        <p class="muted">Every estate has the default <b>Estate Admin</b> (root access) and <b>Resident</b> roles. Create more as needed.</p>
      </div>
      <button v-if="manage && editing === null" class="btn primary" @click="edit()">New role</button>
    </div>
    <FormError :error="error" />

    <form v-if="editing !== null" class="card card-body form" @submit.prevent="save">
      <h2>{{ editing === 'new' ? 'New role' : 'Edit role' }}</h2>
      <div class="form-grid">
        <label>Name <input v-model="form.name" required minlength="2" :disabled="roles?.find((r) => r.id === editing)?.is_default" /></label>
        <label>Description <input v-model="form.description" /></label>
      </div>
      <div class="grid">
        <div v-for="(perms, group) in groups" :key="group" class="perm-group">
          <h3>{{ group }}</h3>
          <label v-for="p in perms" :key="p.key" class="check" :title="p.key">
            <input v-model="form.permissions" type="checkbox" :value="p.key" :disabled="!grantable(p.key)" /> {{ p.label }}
          </label>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="editing = null">Cancel</button>
        <button class="btn primary" :disabled="pending">Save role</button>
      </div>
    </form>

    <div class="grid-2">
      <div v-for="role in roles" :key="role.id" class="card">
        <div class="card-head">
          <div>
            <h2>{{ role.name }}
              <span v-if="role.is_admin" class="badge primary">Root</span>
              <span v-else-if="role.is_default" class="badge">Default</span>
            </h2>
            <p class="small muted">{{ role.description || '—' }} · {{ role.member_count }} member(s)</p>
          </div>
          <div v-if="manage && !role.is_admin" class="row">
            <button class="btn sm" @click="edit(role)">Edit</button>
            <button v-if="!role.is_default" class="btn sm danger" @click="remove(role)">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <p v-if="role.is_admin" class="muted">All permissions in this estate. This role cannot be changed.</p>
          <div v-else-if="role.permissions.length" class="row">
            <span v-for="p in role.permissions" :key="p" class="badge">{{ labelFor(p) }}</span>
          </div>
          <p v-else class="muted">No permissions.</p>
        </div>
      </div>
    </div>
  </div>
</template>
