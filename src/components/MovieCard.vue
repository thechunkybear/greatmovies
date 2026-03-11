<script setup lang="ts">
import StreamingBadge from './StreamingBadge.vue';

interface ServiceMeta { id: number; name: string; logo: string; }
interface Movie {
  id: number; t: string; y: number; g: number[];
  o: string; p: string; r: number; s: number[];
  imdb?: number;
  cr?: { ebert?: { r: number; g: boolean; u?: string } };
}

const props = defineProps<{
  movie: Movie;
  services: ServiceMeta[];
}>();

const emit = defineEmits<{ (e: 'open', movie: Movie): void }>();

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const ebert = computed(() => props.movie.cr?.ebert);
const ebertStars = computed(() => ebert.value ? (ebert.value.r / 2).toFixed(1) : null);

const visibleServices = computed(() =>
  props.movie.s.slice(0, 4).map(id => props.services.find(s => s.id === id)).filter(Boolean) as ServiceMeta[]
);

function starsStr(n: number): string {
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '');
}
</script>

<script lang="ts">
import { computed } from 'vue';
export default {};
</script>

<template>
  <article class="movie-card" @click="emit('open', movie)" tabindex="0" @keydown.enter="emit('open', movie)">
    <img
      v-if="movie.p"
      :src="`${TMDB_IMG}${movie.p}`"
      :alt="movie.t"
      class="card-poster"
      loading="lazy"
      decoding="async"
    />
    <div v-else class="card-poster-placeholder">🎬</div>

    <div class="card-body">
      <div class="card-title">{{ movie.t }}</div>
      <div class="card-year">{{ movie.y }}</div>
      <div class="card-ratings">
        <span v-if="ebertStars" class="card-ebert" :title="`Ebert: ${ebertStars}/4`">
          {{ starsStr(ebert!.r / 2) }}
        </span>
        <span v-if="ebert?.g" class="card-great">Great</span>
        <span v-if="movie.imdb" class="card-imdb" :title="`IMDB: ${(movie.imdb / 10).toFixed(1)}`">
          ⭐ {{ (movie.imdb / 10).toFixed(1) }}
        </span>
      </div>
    </div>

    <div v-if="visibleServices.length" class="card-services">
      <StreamingBadge
        v-for="svc in visibleServices"
        :key="svc.id"
        :name="svc.name"
        :logo="svc.logo"
        size="sm"
      />
      <span v-if="movie.s.length > 4" class="more-services">+{{ movie.s.length - 4 }}</span>
    </div>
  </article>
</template>

<style scoped>
.card-imdb { font-size: .72rem; color: var(--text-muted); }
.more-services {
  font-size: .65rem;
  color: var(--text-dim);
  display: inline-flex;
  align-items: center;
}
</style>
