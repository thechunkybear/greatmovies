import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config({ path: path.join(process.cwd(), '.env') });

const CACHE_DIR = path.join(process.cwd(), 'data/raw/tmdb-cache');
const BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_MS = 25; // ~40 req/sec to stay within TMDB limits

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function getCachePath(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

function readCache(key: string): unknown | null {
  const p = getCachePath(key);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function writeCache(key: string, data: unknown) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCachePath(key), JSON.stringify(data));
}

export async function tmdbGet(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = process.env.TMDB_API_KEY;
  if (!token) throw new Error('TMDB_API_KEY not set in environment');

  // Supports both v3 API keys and v4 Bearer tokens (JWT)
  const isBearer = token.startsWith('ey');
  const searchParams = new URLSearchParams(params);
  const url = `${BASE_URL}${endpoint}?${searchParams}`;
  const cacheKey = `${endpoint}__${searchParams.toString()}`.slice(0, 200);

  const cached = readCache(cacheKey);
  if (cached !== null) return cached;

  await rateLimit();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isBearer) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    searchParams.set('api_key', token);
  }

  const res = await fetch(isBearer ? url : `${BASE_URL}${endpoint}?${searchParams}`, { headers });
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000));
    return tmdbGet(endpoint, params);
  }
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${endpoint}`);
  }

  const data = await res.json();
  writeCache(cacheKey, data);
  return data;
}

export async function tmdbGetMovieByImdbId(imdbId: string): Promise<unknown> {
  return tmdbGet(`/find/${imdbId}`, { external_source: 'imdb_id' });
}

export async function tmdbGetMovieDetails(tmdbId: number): Promise<unknown> {
  return tmdbGet(`/movie/${tmdbId}`, { append_to_response: 'watch/providers' });
}

export async function tmdbSearchMovie(title: string, year: number): Promise<unknown> {
  return tmdbGet('/search/movie', { query: title, year: String(year), language: 'en-US' });
}

export async function tmdbGetProviders(): Promise<unknown> {
  return tmdbGet('/watch/providers/movie', { watch_region: 'US', language: 'en-US' });
}
