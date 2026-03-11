<script setup lang="ts">
const props = defineProps<{
  rating: number;     // 0–8 (stored as stars×2)
  maxRating?: number; // default 8
  showStars?: boolean;
  compact?: boolean;
}>();

const stars = computed(() => props.rating / 2);

function starsDisplay(n: number): string {
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(4 - full - (half ? 1 : 0));
}
</script>

<script lang="ts">
import { computed } from 'vue';
export default {};
</script>

<template>
  <span class="critic-badge" :class="{ compact }">
    <span class="star-display">{{ starsDisplay(stars) }}</span>
    <span v-if="!compact" class="rating-text">{{ stars.toFixed(1) }}/4</span>
  </span>
</template>

<style scoped>
.critic-badge {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  font-size: .8rem;
}
.star-display { color: var(--star); }
.rating-text { color: var(--text-muted); font-size: .75rem; }
.compact .star-display { font-size: .7rem; }
</style>
