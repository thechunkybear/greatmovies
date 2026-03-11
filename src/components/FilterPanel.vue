<script setup lang="ts">
import ServicePicker from './ServicePicker.vue';

interface ServiceMeta { id: number; name: string; logo: string; }
interface GenreMeta { id: number; name: string; }
interface CriticMeta {
  key: string; name: string; maxRating: number;
  ratingStep: number; hasDesignation: boolean; designationLabel?: string;
}

interface FilterState {
  query: string;
  myServices: number[];
  onlyMyServices: boolean;
  genres: number[];
  decades: number[];
  sort: string;
  criticFilters: Record<string, { minRating: number; designationOnly: boolean }>;
  duration: [number, number];
}

const props = defineProps<{
  filters: FilterState;
  services: ServiceMeta[];
  genres: GenreMeta[];
  decades: number[];
  critics: CriticMeta[];
}>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterState>): void;
}>();

const showServicePicker = ref(false);

function setCriticFilter(criticKey: string, patch: { minRating?: number; designationOnly?: boolean }) {
  const current = props.filters.criticFilters[criticKey] ?? { minRating: 0, designationOnly: false };
  emit('update', {
    criticFilters: {
      ...props.filters.criticFilters,
      [criticKey]: { ...current, ...patch },
    },
  });
}

function toggleGenre(id: number) {
  const s = new Set(props.filters.genres);
  if (s.has(id)) s.delete(id); else s.add(id);
  emit('update', { genres: [...s] });
}

function toggleDecade(d: number) {
  const s = new Set(props.filters.decades);
  if (s.has(d)) s.delete(d); else s.add(d);
  emit('update', { decades: [...s] });
}

function starsLabel(val: number, max: number): string {
  if (val === 0) return 'Any';
  const stars = val * max / (max * 2); // val is 0–maxRating*2
  const full = Math.floor(stars);
  const half = stars % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '+';
}
</script>

<script lang="ts">
import { ref } from 'vue';
export default {};
</script>

<template>
  <aside class="filter-sidebar">
    <!-- Search -->
    <div class="filter-section">
      <label class="filter-label">Search</label>
      <input
        class="filter-search"
        type="search"
        placeholder="Title, director…"
        :value="filters.query"
        @input="emit('update', { query: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <!-- Sort -->
    <div class="filter-section">
      <label class="filter-label">Sort by</label>
      <select
        class="filter-select"
        :value="filters.sort"
        @change="emit('update', { sort: ($event.target as HTMLSelectElement).value })"
      >
        <option value="ebert-desc">Ebert rating ↓</option>
        <option value="ebert-asc">Ebert rating ↑</option>
        <option value="year-desc">Newest first</option>
        <option value="year-asc">Oldest first</option>
        <option value="title-asc">Title A–Z</option>
        <option value="imdb-desc">IMDB rating ↓</option>
      </select>
    </div>

    <!-- Streaming -->
    <div class="filter-section">
      <div class="filter-label" style="margin-bottom:.4rem">Streaming</div>
      <div class="toggle-row">
        <span>Only my services</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="filters.onlyMyServices"
            @change="emit('update', { onlyMyServices: ($event.target as HTMLInputElement).checked })"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:.5rem;font-size:.8rem" @click="showServicePicker = !showServicePicker">
        {{ filters.myServices.length ? `${filters.myServices.length} service(s) selected` : 'Select services…' }}
      </button>
      <ServicePicker
        v-if="showServicePicker"
        :services="services"
        :selected="filters.myServices"
        @update:selected="emit('update', { myServices: $event })"
        @dismiss="showServicePicker = false"
      />
    </div>

    <!-- Per-critic filters (dynamic) -->
    <div v-for="critic in critics" :key="critic.key" class="filter-section">
      <div class="filter-label">{{ critic.name }}</div>
      <div class="toggle-row" style="font-size:.82rem;margin-bottom:.4rem">
        <span>Min: {{ starsLabel(filters.criticFilters[critic.key]?.minRating ?? 0, critic.maxRating) }}</span>
      </div>
      <input
        class="rating-slider"
        type="range"
        :min="0"
        :max="critic.maxRating * 2"
        step="1"
        :value="filters.criticFilters[critic.key]?.minRating ?? 0"
        @input="setCriticFilter(critic.key, { minRating: parseInt(($event.target as HTMLInputElement).value) })"
      />
      <div v-if="critic.hasDesignation" class="toggle-row" style="margin-top:.4rem">
        <span style="font-size:.82rem">{{ critic.designationLabel ?? 'Designation' }} only</span>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="filters.criticFilters[critic.key]?.designationOnly ?? false"
            @change="setCriticFilter(critic.key, { designationOnly: ($event.target as HTMLInputElement).checked })"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <!-- Duration -->
    <div class="filter-section">
      <div class="filter-label">Duration</div>
      <div class="duration-labels">
        <span>{{ filters.duration[0] === 0 ? 'Any' : `${filters.duration[0]}m` }}</span>
        <span>–</span>
        <span>{{ filters.duration[1] >= 300 ? '5h+' : `${filters.duration[1]}m` }}</span>
      </div>
      <div class="dual-range">
        <div class="dual-range-track"></div>
        <div class="dual-range-fill" :style="{
          left: (filters.duration[0] / 300 * 100) + '%',
          right: ((300 - filters.duration[1]) / 300 * 100) + '%',
        }"></div>
        <input
          class="dual-range-input"
          type="range"
          min="0"
          max="300"
          step="5"
          :value="filters.duration[0]"
          :style="{ zIndex: filters.duration[0] >= 290 ? 5 : 3 }"
          @input="emit('update', { duration: [Math.min(parseInt(($event.target as HTMLInputElement).value), filters.duration[1] - 5), filters.duration[1]] })"
        />
        <input
          class="dual-range-input"
          type="range"
          min="0"
          max="300"
          step="5"
          :value="filters.duration[1]"
          :style="{ zIndex: 4 }"
          @input="emit('update', { duration: [filters.duration[0], Math.max(parseInt(($event.target as HTMLInputElement).value), filters.duration[0] + 5)] })"
        />
      </div>
    </div>

    <!-- Genres -->
    <div class="filter-section">
      <div class="filter-label">Genre</div>
      <div class="pill-group">
        <button
          v-for="g in genres"
          :key="g.id"
          class="pill"
          :class="{ active: filters.genres.includes(g.id) }"
          @click="toggleGenre(g.id)"
        >
          {{ g.name }}
        </button>
      </div>
    </div>

    <!-- Decades -->
    <div class="filter-section">
      <div class="filter-label">Decade</div>
      <div class="pill-group">
        <button
          v-for="d in decades"
          :key="d"
          class="pill"
          :class="{ active: filters.decades.includes(d) }"
          @click="toggleDecade(d)"
        >
          {{ d }}s
        </button>
      </div>
    </div>

    <!-- Clear filters -->
    <button
      class="btn btn-ghost"
      style="margin-top:auto;font-size:.8rem"
      @click="emit('update', {
        query: '', genres: [], decades: [], onlyMyServices: false,
        criticFilters: {},
        sort: 'ebert-desc',
        duration: [0, 300],
      })"
    >
      Clear all filters
    </button>
  </aside>
</template>
