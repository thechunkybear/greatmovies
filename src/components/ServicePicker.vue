<script setup lang="ts">
import StreamingBadge from './StreamingBadge.vue';
import { ref, computed } from 'vue';

interface ServiceMeta { id: number; name: string; logo: string; }

const props = defineProps<{
  services: ServiceMeta[];
  selected: number[];
}>();

const emit = defineEmits<{
  (e: 'update:selected', ids: number[]): void;
  (e: 'dismiss'): void;
}>();

const query = ref('');
const filtered = computed(() =>
  query.value.trim()
    ? props.services.filter(s => s.name.toLowerCase().includes(query.value.toLowerCase()))
    : props.services
);

function toggle(id: number) {
  const s = new Set(props.selected);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  emit('update:selected', [...s]);
}

function selectAll() { emit('update:selected', props.services.map(s => s.id)); }
function clearAll() { emit('update:selected', []); }
</script>

<template>
  <div class="service-picker">
    <div class="sp-header">
      <span class="sp-title">My Streaming Services</span>
      <div class="sp-actions">
        <button class="sp-btn" @click="selectAll">All</button>
        <button class="sp-btn" @click="clearAll">None</button>
      </div>
    </div>
    <input
      v-model="query"
      class="sp-search"
      type="search"
      placeholder="Search services…"
      autofocus
    />
    <div class="sp-grid">
      <button
        v-for="svc in filtered"
        :key="svc.id"
        class="sp-item"
        :class="{ active: selected.includes(svc.id) }"
        @click="toggle(svc.id)"
        :title="svc.name"
      >
        <StreamingBadge :name="svc.name" :logo="svc.logo" size="md" />
        <span class="sp-name">{{ svc.name }}</span>
      </button>
    </div>
    <button class="btn btn-primary sp-save" @click="emit('dismiss')">Done</button>
  </div>
</template>

<style scoped>
.service-picker {
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .75rem;
}
.sp-title { font-size: .85rem; font-weight: 600; }
.sp-actions { display: flex; gap: .5rem; }
.sp-btn {
  font-size: .75rem;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: .2rem .5rem;
  cursor: pointer;
  background: none;
  font-family: inherit;
}
.sp-btn:hover { color: var(--text); border-color: var(--border-light); }

.sp-search {
  width: 100%;
  padding: .4rem .6rem;
  margin-bottom: .6rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: .85rem;
  font-family: inherit;
  outline: none;
}
.sp-search:focus { border-color: var(--accent-dim); }
.sp-search::placeholder { color: var(--text-dim); }

.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: .4rem;
  margin-bottom: 1rem;
  max-height: 240px;
  overflow-y: auto;
}
.sp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .3rem;
  padding: .5rem;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}
.sp-item:hover { border-color: var(--accent-dim); }
.sp-item.active { border-color: var(--accent); background: rgba(232,197,109,.1); }
.sp-name { font-size: .65rem; color: var(--text-muted); text-align: center; line-height: 1.2; }
.sp-item.active .sp-name { color: var(--accent); }

.sp-save { width: 100%; padding: .5rem; font-size: .85rem; }
</style>
