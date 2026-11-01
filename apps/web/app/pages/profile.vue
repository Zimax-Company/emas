<script setup lang="ts">
useHead({ title: 'Profile — EMAS' })
const { user } = useSession()
const form = reactive({ current_password: '', new_password: '' })
const done = ref(false)
const { pending, error, run } = useAction()

async function submit() {
  done.value = false
  await run(async () => {
    await apiCall('PUT', '/auth/password', form)
    form.current_password = ''
    form.new_password = ''
    done.value = true
  })
}
</script>

<template>
  <div class="stack" style="max-width: 520px">
    <div class="page-head">
      <div>
        <h1>{{ user?.name }}</h1>
        <p class="muted">{{ user?.email }}</p>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Change password</h2></div>
      <form class="card-body form" @submit.prevent="submit">
        <FormError :error="error" />
        <div v-if="done" class="alert success">Password updated.</div>
        <label>Current password <input v-model="form.current_password" type="password" autocomplete="current-password" required /></label>
        <label>New password <input v-model="form.new_password" type="password" minlength="8" autocomplete="new-password" required /></label>
        <div class="actions"><button class="btn primary" :disabled="pending">Update password</button></div>
      </form>
    </div>
  </div>
</template>
