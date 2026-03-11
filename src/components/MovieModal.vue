<script setup lang="ts">
import StreamingBadge from './StreamingBadge.vue';

interface ServiceMeta { id: number; name: string; logo: string; }
interface GenreMeta { id: number; name: string; }
interface Movie {
  id: number; t: string; y: number; g: number[];
  o: string; p: string; r: number; s: number[];
  imdb?: number;
  cr?: { ebert?: { r: number; g: boolean; u?: string } };
}

const props = defineProps<{
  movie: Movie | null;
  services: ServiceMeta[];
  genres: GenreMeta[];
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const ebert = computed(() => props.movie?.cr?.ebert);
const ebertStars = computed(() => ebert.value ? ebert.value.r / 2 : null);

const movieServices = computed(() =>
  (props.movie?.s ?? []).map(id => props.services.find(s => s.id === id)).filter(Boolean) as ServiceMeta[]
);

const movieGenres = computed(() =>
  (props.movie?.g ?? []).map(id => props.genres.find(g => g.id === id)).filter(Boolean) as GenreMeta[]
);

function starsStr(n: number): string {
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  const empty = 4 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, empty));
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
    emit('close');
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<script lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
export default {};
</script>

<template>
  <Teleport to="body">
    <div
      class="modal-overlay"
      :class="{ hidden: !movie }"
      @click="handleOverlayClick"
      role="dialog"
      aria-modal="true"
    >
      <div v-if="movie" class="modal">
        <button class="modal-close" @click="emit('close')" aria-label="Close">✕</button>

        <div class="modal-hero">
          <div class="modal-poster">
            <img v-if="movie.p" :src="`${TMDB_IMG}${movie.p}`" :alt="movie.t" />
            <div v-else class="modal-poster-placeholder">🎬</div>
          </div>

          <div class="modal-info">
            <h2 class="modal-title">{{ movie.t }}</h2>
            <div class="modal-meta">
              {{ movie.y }}
              <span v-if="movie.r"> · {{ movie.r }}m</span>
              <span v-if="movieGenres.length"> · {{ movieGenres.map(g => g.name).join(', ') }}</span>
            </div>

            <div v-if="ebert?.g" style="margin-bottom:.75rem">
              <span class="card-great" style="font-size:.75rem;padding:.2rem .5rem">
                Roger Ebert's Great Movie
              </span>
            </div>

            <div class="modal-ratings">
              <div v-if="ebertStars !== null" class="rating-chip">
                <span class="rating-chip-label">Ebert</span>
                <span class="rating-chip-value">{{ starsStr(ebertStars) }}</span>
                <span style="font-size:.75rem;color:var(--text-muted)">{{ ebertStars.toFixed(1) }}/4</span>
              </div>
              <div v-if="movie.imdb" class="rating-chip">
                <span class="rating-chip-label">IMDB</span>
                <span class="rating-chip-value" style="color:var(--text)">{{ (movie.imdb/10).toFixed(1) }}</span>
              </div>
            </div>

            <p class="modal-overview">{{ movie.o }}</p>

            <a
              v-if="ebert?.u"
              :href="ebert.u"
              target="_blank"
              rel="noopener noreferrer"
              class="modal-review-link"
            >
              Read Ebert's review →
            </a>
          </div>
        </div>

        <div v-if="movieServices.length" class="modal-services">
          <div class="modal-services-label">Streaming on</div>
          <div class="modal-services-list">
            <div v-for="svc in movieServices" :key="svc.id" class="modal-service-badge">
              <StreamingBadge :name="svc.name" :logo="svc.logo" size="sm" />
              {{ svc.name }}
            </div>
          </div>
        </div>
        <div v-else class="modal-services" style="padding-bottom:1.5rem">
          <span style="font-size:.85rem;color:var(--text-muted)">Not currently streaming</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.card-great {
  display: inline-block;
  background: var(--accent);
  color: #000;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}
</style>
