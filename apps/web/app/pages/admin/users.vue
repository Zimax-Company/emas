<script setup lang="ts">
useHead({ title: 'Users — EMAS' })
type U = { id: number; name: string; email: string; phone: string | null; is_system_admin: boolean; is_active: boolean; last_login_at: string | null }

const q = ref('')
const { data: users, refresh } = useApi<U[]>(() => `/users${q.value ? `?q=${encodeURIComponent(q.value)}` : ''}`, { key: 'admin-users' })
const { user: me } = useSession()
const form = reactive({ name: '', email: '', password: '', is_system_admin: false })
const showForm = ref(false)
const tempPassword = ref<string | null>(null)
const { pending, error, run } = useAction()

async function create() {
  await run(async () => {
    const res = await apiCall<{ temporary_password: string | null }>('POST', '/users', {
      name: form.name, email: form.email, is_system_admin: form.is_system_admin,
      ...(form.password ? { password: form.password } : {}),
    })
    tempPassword.value = res.temporary_password
    Object.assign(form, { name: '', email: '', password: '', is_system_admin: false })
    showForm.value = false
    await refresh()
  })
}

async function toggle(u: U, field: 'is_active' | 'is_system_admin') {
  await run(async () => {
    await apiCall('PATCH', `/users/${u.id}`, { [field]: !u[field] })
    await refresh()
  })
}
</script>

<template>
  <div class="stack">
    <div class="page-head">
      <div>
        <h1>Users</h1>
        <p class="muted">Every account across all estates.</p>
      </div>
      <button class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'New user' }}</button>
    </div>
    <FormError :error="error" />
    <div v-if="tempPassword" class="alert success">User created. Temporary password: <code>{{ tempPassword }}</code></div>

    <form v-if="showForm" class="card card-body form" @submit.prevent="create">
      <div class="form-grid">
        <label>Name <input v-model="form.name" required /></label>
        <label>Email <input v-model="form.email" type="email" required /></label>
        <label>Password <input v-model="form.password" type="password" minlength="8" placeholder="Leave blank to generate" /></label>
      </div>
      <label class="check"><input v-model="form.is_system_admin" type="checkbox" /> System admin (all permissions, every estate)</label>
      <div class="actions"><button class="btn primary" :disabled="pending">Create user</button></div>
    </form>

    <div class="card">
      <div class="card-head"><input v-model="q" placeholder="Search name or email" style="max-width: 320px" @keyup.enter="refresh()" /></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Last login</th><th /></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }} <span v-if="u.is_system_admin" class="badge primary">System admin</span></td>
              <td>{{ u.email }}</td>
              <td><span class="badge" :class="u.is_active ? 'success' : 'danger'">{{ u.is_active ? 'Active' : 'Disabled' }}</span></td>
              <td class="muted">{{ date(u.last_login_at, true) }}</td>
              <td class="actions">
                <template v-if="u.id !== me?.id">
                  <button class="btn sm" @click="toggle(u, 'is_system_admin')">{{ u.is_system_admin ? 'Revoke admin' : 'Make admin' }}</button>
                  <button class="btn sm" :class="{ danger: u.is_active }" @click="toggle(u, 'is_active')">{{ u.is_active ? 'Disable' : 'Enable' }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
