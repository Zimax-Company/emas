<script setup lang="ts">
definePageMeta({ layout: 'estate' })
useHead({ title: 'Members — EMAS' })

type Role = { id: number; name: string; slug: string; is_admin: boolean }
type Member = { id: number; user_id: number; name: string; email: string; phone: string | null; roles: Role[]; residences: { id: number; name: string }[] }

const { eid, base, can, data: estate } = useEstate()
const { data: members, refresh } = await useApi<Member[]>(() => `/estates/${eid.value}/members`)
const manage = computed(() => can('members.manage'))
const { data: roles } = await useApi<Role[]>(() => `/estates/${eid.value}/roles`, { immediate: manage.value })
const { data: residences } = await useApi<{ id: number; name: string }[]>(() => `/estates/${eid.value}/residences`, { immediate: manage.value })
// Only estate admins may hand out the admin role.
const assignable = computed(() => (roles.value ?? []).filter((r) => !r.is_admin || estate.value?.access.is_admin))

const showForm = ref(false)
const form = reactive({ name: '', email: '', phone: '', password: '', role_ids: [] as number[], residence_id: '' as string | number })
const tempPassword = ref<string | null>(null)
const { pending, error, run } = useAction()

async function add() {
  await run(async () => {
    const res = await apiCall<{ temporary_password: string | null }>('POST', `/estates/${eid.value}/members`, {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      ...(form.password ? { password: form.password } : {}),
      role_ids: form.role_ids,
      residence_id: form.residence_id ? Number(form.residence_id) : null,
    })
    tempPassword.value = res.temporary_password
    Object.assign(form, { name: '', email: '', phone: '', password: '', role_ids: [], residence_id: '' })
    showForm.value = false
    await refresh()
  })
}

const editing = ref<number | null>(null)
const editRoles = ref<number[]>([])
function startEdit(m: Member) {
  editing.value = m.id
  editRoles.value = m.roles.map((r) => r.id)
}
async function saveRoles(m: Member) {
  await run(async () => {
    await apiCall('PATCH', `/estates/${eid.value}/members/${m.id}`, { role_ids: editRoles.value })
    editing.value = null
    await refresh()
  })
}
async function remove(m: Member) {
  if (!confirm(`Remove ${m.name} from this estate?`)) return
  await run(async () => { await apiCall('DELETE', `/estates/${eid.value}/members/${m.id}`); await refresh() })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Members</h1>
        <p class="muted">People with access to this estate, and their roles.</p>
      </div>
      <button v-if="manage" class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'Add member' }}</button>
    </div>
    <FormError :error="error" />
    <div v-if="tempPassword" class="alert success">Account created. Temporary password: <code>{{ tempPassword }}</code> — share it with the member; it won't be shown again.</div>

    <form v-if="showForm" class="card card-body form" @submit.prevent="add">
      <div class="form-grid">
        <label>Name <input v-model="form.name" required /></label>
        <label>Email <input v-model="form.email" type="email" required /></label>
        <label>Phone <input v-model="form.phone" /></label>
        <label>Password <input v-model="form.password" type="password" minlength="8" placeholder="Leave blank to generate" /></label>
      </div>
      <div class="form-grid">
        <div>
          <div style="font-weight: 500; margin-bottom: 4px">Roles <span class="small muted">(defaults to Resident)</span></div>
          <label v-for="r in assignable" :key="r.id" class="check"><input v-model="form.role_ids" type="checkbox" :value="r.id" /> {{ r.name }}</label>
        </div>
        <label>Link to residence
          <select v-model="form.residence_id"><option value="">None</option><option v-for="r in residences" :key="r.id" :value="r.id">{{ r.name }}</option></select>
        </label>
      </div>
      <p class="small muted">If the email already has an account, it is added to this estate as-is.</p>
      <div class="actions"><button class="btn primary" :disabled="pending">Add member</button></div>
    </form>

    <div class="card">
      <div class="table-wrap">
        <table v-if="members?.length">
          <thead><tr><th>Name</th><th>Roles</th><th>Residence</th><th /></tr></thead>
          <tbody>
            <tr v-for="m in members" :key="m.id">
              <td>{{ m.name }}<div class="small muted">{{ m.email }}</div></td>
              <td>
                <template v-if="editing === m.id">
                  <label v-for="r in assignable" :key="r.id" class="check"><input v-model="editRoles" type="checkbox" :value="r.id" /> {{ r.name }}</label>
                </template>
                <template v-else>
                  <span v-for="r in m.roles" :key="r.id" class="badge" :class="{ primary: r.is_admin }" style="margin-right: 4px">{{ r.name }}</span>
                </template>
              </td>
              <td>
                <NuxtLink v-for="r in m.residences" :key="r.id" :to="`${base}/residences/${r.id}`" style="margin-right: 6px">{{ r.name }}</NuxtLink>
                <span v-if="!m.residences.length" class="muted">—</span>
              </td>
              <td class="actions">
                <template v-if="manage">
                  <template v-if="editing === m.id">
                    <button class="btn sm" @click="editing = null">Cancel</button>
                    <button class="btn sm primary" :disabled="pending || !editRoles.length" @click="saveRoles(m)">Save</button>
                  </template>
                  <template v-else>
                    <button class="btn sm" @click="startEdit(m)">Roles</button>
                    <button class="btn sm danger" @click="remove(m)">Remove</button>
                  </template>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No members yet.</div>
      </div>
    </div>
  </div>
</template>
