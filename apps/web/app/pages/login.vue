<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in — EMAS' })

const session = useSession()
const route = useRoute()
const email = ref('')
const password = ref('')
const { pending, error, run } = useAction()

async function submit() {
  await run(async () => {
    await session.login(email.value, password.value)
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'
    await navigateTo(next)
  })
}
</script>

<template>
  <div class="card auth-card">
    <div class="card-body form">
      <div>
        <div class="brand" style="font-size: 22px">EM<span>AS</span></div>
        <p class="muted">Estate management, sign in to continue.</p>
      </div>
      <FormError :error="error" />
      <form class="form" @submit.prevent="submit">
        <label>Email <input v-model="email" type="email" autocomplete="username" required /></label>
        <label>Password <input v-model="password" type="password" autocomplete="current-password" required /></label>
        <button class="btn primary" :disabled="pending">{{ pending ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </div>
  </div>
</template>
