<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import MovieCard from './MovieCard.vue';

interface ServiceMeta { id: number; name: string; logo: string; }
interface Movie {
  id: number; t: string; y: number; g: number[];
  o: string; p: string; r: number; s: number[];
  imdb?: number;
  cr?: { ebert?: { r: number; g: boolean; u?: string } };
}

const props = defineProps<{
  movies: Movie[];
  services: ServiceMeta[];
}>();

const emit = defineEmits<{ (e: 'open', movie: Movie): void }>();

const PAGE_SIZE = 60;
const displayed = ref(PAGE_SIZE);
const sentinel = ref<HTMLElement | null>(null);

const visible = computed(() => props.movies.slice(0, displayed.value));

let observer: IntersectionObserver | null = null;

function setupObserver() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && displayed.value < props.movies.length) {
      displayed.value = Math.min(displayed.value + PAGE_SIZE, props.movies.length);
    }
  }, { rootMargin: '200px' });
  if (sentinel.value) observer.observe(sentinel.value);
}

onMounted(() => setupObserver());
onUnmounted(() => observer?.disconnect());

// Reset pagination when movie list changes
watch(() => props.movies, () => { displayed.value = PAGE_SIZE; });
</script>

<script lang="ts">
import { computed } from 'vue';
export default {};
</script>

<template>
  <div>
    <div v-if="movies.length === 0" class="empty-state">
      <h3>No movies found</h3>
      <p>Try adjusting your filters</p>
    </div>
    <div v-else class="movie-grid">
      <MovieCard
        v-for="movie in visible"
        :key="movie.id"
        :movie="movie"
        :services="services"
        @open="emit('open', $event)"
      />
    </div>
    <div ref="sentinel" class="scroll-sentinel" aria-hidden="true"></div>
  </div>
</template>
