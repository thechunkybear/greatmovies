<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import FilterPanel from './FilterPanel.vue';
import MovieGrid from './MovieGrid.vue';
import MovieModal from './MovieModal.vue';
import type { Movie, SiteMeta } from '../types.ts';

interface FilterState {
  query: string;
  myServices: number[];
  onlyMyServices: boolean;
  genres: number[];
  decades: number[];
  sort: string;
  criticFilters: Record<string, { minRating: number; designationOnly: boolean }>;
}

// ── State ────────────────────────────────────────────────────────────────────

const movies = ref<Movie[]>([]);
const meta = ref<SiteMeta>({
  genres: [], decades: [], services: [], critics: [], generatedAt: '',
});
const loading = ref(true);
const error = ref('');

const filters = ref<FilterState>({
  query: '',
  myServices: [],
  onlyMyServices: false,
  genres: [],
  decades: [],
  sort: 'ebert-desc',
  criticFilters: {},
});

const selectedMovie = ref<Movie | null>(null);
const sidebarOpen = ref(false);
const showOnboarding = ref(false);

// ── Data loading ─────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const [moviesRes, metaRes] = await Promise.all([
      fetch(`${base}/data/movies.json`),
      fetch(`${base}/data/meta.json`),
    ]);
    if (!moviesRes.ok || !metaRes.ok) throw new Error('Failed to load data');
    [movies.value, meta.value] = await Promise.all([moviesRes.json(), metaRes.json()]);
  } catch (e) {
    error.value = 'Failed to load movie data. Please refresh.';
    console.error(e);
  } finally {
    loading.value = false;
  }

  try {
    const saved = localStorage.getItem('gm:myServices');
    if (saved) {
      filters.value.myServices = JSON.parse(saved);
    } else {
      showOnboarding.value = true;
    }
    syncFromUrl();
  } catch { /* private mode */ }
});

// ── Persistence ──────────────────────────────────────────────────────────────

watch(() => filters.value.myServices, (ids) => {
  try { localStorage.setItem('gm:myServices', JSON.stringify(ids)); } catch {}
});

// ── URL Sync ─────────────────────────────────────────────────────────────────

function syncFromUrl() {
  const p = new URLSearchParams(window.location.search);
  if (p.get('q')) filters.value.query = p.get('q')!;
  if (p.get('genres')) filters.value.genres = p.get('genres')!.split(',').map(Number).filter(Boolean);
  if (p.get('decades')) filters.value.decades = p.get('decades')!.split(',').map(Number).filter(Boolean);
  if (p.get('sort')) filters.value.sort = p.get('sort')!;
}

function syncToUrl() {
  const p = new URLSearchParams();
  if (filters.value.query) p.set('q', filters.value.query);
  if (filters.value.genres.length) p.set('genres', filters.value.genres.join(','));
  if (filters.value.decades.length) p.set('decades', filters.value.decades.join(','));
  if (filters.value.sort !== 'ebert-desc') p.set('sort', filters.value.sort);
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

watch(filters, syncToUrl, { deep: true });

// ── Filtering ─────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout>;
const debouncedQuery = ref('');
watch(() => filters.value.query, (q) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { debouncedQuery.value = q; }, 180);
}, { immediate: true });

const filtered = computed<Movie[]>(() => {
  const f = filters.value;
  const q = debouncedQuery.value.toLowerCase().trim();

  return movies.value.filter(m => {
    if (q && !m.t.toLowerCase().includes(q)) return false;
    if (f.onlyMyServices && f.myServices.length > 0) {
      if (!m.s.some(id => f.myServices.includes(id))) return false;
    }
    if (f.genres.length > 0 && !f.genres.some(g => m.g.includes(g))) return false;
    if (f.decades.length > 0) {
      const decade = Math.floor(m.y / 10) * 10;
      if (!f.decades.includes(decade)) return false;
    }
    for (const [key, cf] of Object.entries(f.criticFilters)) {
      const review = m.cr?.[key as 'ebert'];
      if (!review) {
        if (cf.minRating > 0 || cf.designationOnly) return false;
        continue;
      }
      if (cf.minRating > 0 && review.r < cf.minRating) return false;
      if (cf.designationOnly && !review.g) return false;
    }
    return true;
  }).sort((a, b) => {
    switch (f.sort) {
      case 'ebert-asc':  return (a.cr?.ebert?.r ?? 0) - (b.cr?.ebert?.r ?? 0);
      case 'ebert-desc': return (b.cr?.ebert?.r ?? 0) - (a.cr?.ebert?.r ?? 0);
      case 'year-desc':  return b.y - a.y;
      case 'year-asc':   return a.y - b.y;
      case 'title-asc':  return a.t.localeCompare(b.t);
      case 'imdb-desc':  return (b.imdb ?? 0) - (a.imdb ?? 0);
      default:           return 0;
    }
  });
});

function updateFilters(patch: Partial<FilterState>) {
  filters.value = { ...filters.value, ...patch };
}
</script>

<template>
  <div>
    <!-- Header -->
    <header class="site-header">
      <div class="site-logo">🎬 <span>Great</span>Movies</div>
      <button class="filter-toggle-btn btn btn-ghost" @click="sidebarOpen = !sidebarOpen">
        ☰ Filters
      </button>
      <span class="results-count" style="margin-left:auto">
        <template v-if="!loading">
          {{ filtered.length.toLocaleString() }} / {{ movies.length.toLocaleString() }} films
        </template>
      </span>
    </header>

    <div class="filter-drawer-overlay" :class="{ open: sidebarOpen }" @click="sidebarOpen = false"></div>

    <main class="site-main">
      <FilterPanel
        :filters="filters"
        :services="meta.services"
        :genres="meta.genres"
        :decades="meta.decades"
        :critics="meta.critics"
        :class="{ open: sidebarOpen }"
        @update="updateFilters"
      />

      <section class="content-area">
        <!-- Loading -->
        <div v-if="loading" class="loading">Loading 8,700+ films…</div>
        <div v-else-if="error" class="empty-state" style="color:var(--red)">{{ error }}</div>

        <template v-else>
          <!-- Onboarding -->
          <div v-if="showOnboarding" class="onboarding">
            <h2>Welcome to Great Movies</h2>
            <p>Browse {{ movies.length.toLocaleString() }} films reviewed by Roger Ebert. Select your streaming services to filter by what you can watch tonight.</p>
            <button class="btn btn-primary" @click="showOnboarding = false">Browse all films</button>
          </div>

          <!-- Results bar -->
          <div class="results-bar">
            <span class="results-count">
              Showing <strong>{{ filtered.length.toLocaleString() }}</strong>
              <template v-if="filtered.length !== movies.length"> of {{ movies.length.toLocaleString() }}</template>
              films
            </span>
            <span v-if="meta.generatedAt" class="results-count" style="font-size:.75rem">
              Data: {{ new Date(meta.generatedAt).toLocaleDateString() }}
            </span>
          </div>

          <MovieGrid :movies="filtered" :services="meta.services" @open="selectedMovie = $event" />
        </template>
      </section>
    </main>

    <MovieModal :movie="selectedMovie" :services="meta.services" :genres="meta.genres" @close="selectedMovie = null" />
  </div>
</template>
