<script setup lang="ts">
useHead({ title: 'New estate — EMAS' })
const { refresh } = useSession()
const form = reactive({ name: '', address: '', currency: 'NGN' })
const admin = reactive({ include: true, name: '', email: '', password: '' })
const result = ref<{ estate: { id: number }; admin: { temporary_password: string | null; created: boolean } | null } | null>(null)
const { pending, error, run } = useAction()

async function submit() {
  await run(async () => {
    result.value = await apiCall('POST', '/estates', {
      ...form,
      admin: admin.include
        ? { name: admin.name, email: admin.email, ...(admin.password ? { password: admin.password } : {}) }
        : undefined,
    })
    await refresh()
    if (!result.value?.admin?.temporary_password) await navigateTo(`/estates/${result.value!.estate.id}`)
  })
}
</script>

<template>
  <div class="stack" style="max-width: 640px">
    <div class="page-head">
      <div>
        <h1>New estate</h1>
        <p class="muted">The estate gets its own dashboard and the default <b>Estate Admin</b> and <b>Resident</b> roles.</p>
      </div>
    </div>

    <div v-if="result?.admin?.temporary_password" class="card card-body form">
      <div class="alert success">Estate created.</div>
      <p>Share this temporary password with the estate admin. It will not be shown again.</p>
      <code style="font-size: 16px">{{ result.admin.temporary_password }}</code>
      <div class="actions"><NuxtLink :to="`/estates/${result.estate.id}`" class="btn primary">Open dashboard</NuxtLink></div>
    </div>

    <form v-else class="card card-body form" @submit.prevent="submit">
      <FormError :error="error" />
      <label>Estate name <input v-model="form.name" required minlength="2" /></label>
      <label>Address <textarea v-model="form.address" rows="2" /></label>
      <label style="max-width: 160px">Currency <input v-model="form.currency" maxlength="3" required /></label>

      <label class="check"><input v-model="admin.include" type="checkbox" /> Assign an estate admin now</label>
      <div v-if="admin.include" class="form-grid">
        <label>Admin name <input v-model="admin.name" required /></label>
        <label>Admin email <input v-model="admin.email" type="email" required /></label>
        <label>Password <input v-model="admin.password" type="password" minlength="8" placeholder="Leave blank to generate" /></label>
      </div>
      <p v-if="admin.include" class="small muted">If the email already has an account, that user is made admin and the password is ignored.</p>
      <div class="actions"><button class="btn primary" :disabled="pending">Create estate</button></div>
    </form>
  </div>
</template>
