<script setup lang="ts">
defineProps<{
  name: string;
  logo: string;
  size?: 'sm' | 'md';
}>();

const TMDB_IMG = 'https://image.tmdb.org/t/p/original';
</script>

<template>
  <img
    v-if="logo"
    :src="`${TMDB_IMG}${logo}`"
    :alt="name"
    :title="name"
    class="streaming-badge"
    :class="size ?? 'sm'"
    loading="lazy"
  />
  <span v-else class="streaming-badge text-badge" :class="size ?? 'sm'" :title="name">
    {{ name.slice(0, 2) }}
  </span>
</template>

<style scoped>
.streaming-badge {
  border-radius: 4px;
  object-fit: cover;
}
.streaming-badge.sm { width: 22px; height: 22px; }
.streaming-badge.md { width: 32px; height: 32px; }
.text-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: .6rem;
  font-weight: 700;
}
</style>
