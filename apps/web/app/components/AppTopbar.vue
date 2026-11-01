<script setup lang="ts">
const { user, estates, logout } = useSession()
const route = useRoute()
const current = computed(() => (route.params.eid ? String(route.params.eid) : ''))

function switchEstate(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  navigateTo(id ? `/estates/${id}` : '/')
}
</script>

<template>
  <header class="topbar">
    <NuxtLink to="/" class="brand">EM<span>AS</span></NuxtLink>
    <select v-if="estates.length" :value="current" aria-label="Switch estate dashboard" @change="switchEstate">
      <option value="">All estates</option>
      <option v-for="e in estates" :key="e.id" :value="String(e.id)">{{ e.name }}</option>
    </select>
    <div class="spacer" />
    <template v-if="user?.is_system_admin">
      <NuxtLink to="/admin/users" class="small">Users</NuxtLink>
      <NuxtLink to="/admin/estates/new" class="small">New estate</NuxtLink>
    </template>
    <NuxtLink to="/profile" class="small">{{ user?.name }}</NuxtLink>
    <button class="btn sm" type="button" @click="logout">Sign out</button>
  </header>
</template>
