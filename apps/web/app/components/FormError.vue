<script setup lang="ts">
defineProps<{ error?: string | null }>()
</script>

<template>
  <div v-if="error" class="alert error" role="alert">{{ error }}</div>
</template>
