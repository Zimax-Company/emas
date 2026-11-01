<script setup lang="ts">
const { data, can, base } = useEstate()
const route = useRoute()
const isResidences = computed(() => route.path.startsWith(`${base.value}/residences`))
</script>

<template>
  <div>
    <AppTopbar />
    <div class="shell">
      <aside class="sidebar">
        <div class="estate-name">
          {{ data?.estate.name }}
          <div class="small muted">{{ data?.access.roles.map((r) => r.name).join(', ') || (data?.access.is_admin ? 'System admin' : '') }}</div>
        </div>
        <nav>
          <NuxtLink :to="base">Dashboard</NuxtLink>
          <NuxtLink :to="`${base}/residences`" :class="{ active: isResidences }">
            {{ can('residences.view') ? 'Residences' : 'My residence' }}
          </NuxtLink>
          <NuxtLink v-if="can('announcements.view')" :to="`${base}/announcements`">Announcements</NuxtLink>
          <NuxtLink v-if="can('dues.view')" :to="`${base}/dues`">Dues</NuxtLink>
          <NuxtLink v-if="can('estate_accounts.view')" :to="`${base}/account`">Estate account</NuxtLink>
          <div v-if="can('members.view') || can('roles.view') || can('estate.update')" class="section">Administration</div>
          <NuxtLink v-if="can('members.view')" :to="`${base}/members`">Members</NuxtLink>
          <NuxtLink v-if="can('roles.view')" :to="`${base}/roles`">Roles &amp; permissions</NuxtLink>
          <NuxtLink v-if="can('estate.update')" :to="`${base}/settings`">Settings</NuxtLink>
        </nav>
      </aside>
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>
