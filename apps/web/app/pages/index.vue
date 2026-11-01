<script setup lang="ts">
useHead({ title: 'Estates — EMAS' })
const { user, estates, refresh } = useSession()
await refresh()
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Your estates</h1>
        <p class="muted">Each estate has its own dashboard. Pick one to open it.</p>
      </div>
      <NuxtLink v-if="user?.is_system_admin" to="/admin/estates/new" class="btn primary">New estate</NuxtLink>
    </div>

    <div v-if="estates.length" class="grid">
      <NuxtLink v-for="e in estates" :key="e.id" :to="`/estates/${e.id}`" class="card card-body" style="color: inherit; text-decoration: none">
        <div class="row between">
          <h2>{{ e.name }}</h2>
          <span v-if="e.is_admin" class="badge primary">Admin</span>
        </div>
        <p class="muted small" style="margin-top: 6px">{{ e.address || 'No address' }}</p>
        <p class="small" style="margin-top: 10px">{{ e.roles.join(', ') || (user?.is_system_admin ? 'System admin' : '') }}</p>
      </NuxtLink>
    </div>
    <div v-else class="card">
      <div class="empty">
        <template v-if="user?.is_system_admin">No estates yet. <NuxtLink to="/admin/estates/new">Create the first one</NuxtLink>.</template>
        <template v-else>You haven't been added to an estate yet. Ask your estate admin to add you.</template>
      </div>
    </div>
  </div>
</template>
