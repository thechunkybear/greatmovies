/**
 * For each Ebert-reviewed movie (matched to IMDB), fetch TMDB details + US watch providers.
 * Input:  data/raw/imdb-map.json  (for IMDB IDs to look up)
 *         data/raw/ebert-reviews.json
 * Output: data/raw/tmdb-movies.json
 */

import fs from 'fs';
import path from 'path';
import { tmdbGetMovieByImdbId, tmdbGetMovieDetails, tmdbGetProviders } from './lib/tmdb-client.js';
import type { TmdbMovieDetails, TmdbProvider, ImdbEntry } from './lib/types.js';

const RAW_DIR = path.join(process.cwd(), 'data/raw');

async function main() {
  const matchedPath = path.join(RAW_DIR, 'ebert-imdb-matched.json');
  const tmdbOutPath = path.join(RAW_DIR, 'tmdb-movies.json');
  const providersOutPath = path.join(RAW_DIR, 'tmdb-providers.json');

  // First verify Criterion Channel availability
  console.log('🔍 Verifying TMDB US watch providers (checking for Criterion Channel)...');
  const providersData = await tmdbGetProviders() as { results: Array<{ provider_id: number; provider_name: string; logo_path: string }> };
  const providers: TmdbProvider[] = (providersData.results ?? []).map(p => ({
    id: p.provider_id,
    name: p.provider_name,
    logoPath: p.logo_path,
  }));
  const criterion = providers.find(p =>
    p.name.toLowerCase().includes('criterion') || p.id === 258
  );
  if (criterion) {
    console.log(`  ✅ Criterion Channel found: ID=${criterion.id}, Name="${criterion.name}"`);
  } else {
    console.log('  ⚠️  Criterion Channel (ID 258) NOT in TMDB US providers list');
    console.log('  Available providers:', providers.slice(0, 10).map(p => `${p.id}:${p.name}`).join(', '));
  }
  fs.writeFileSync(providersOutPath, JSON.stringify(providers, null, 2));
  console.log(`  Saved ${providers.length} providers to ${providersOutPath}`);

  // Load matched reviews (have imdbId attached)
  if (!fs.existsSync(matchedPath)) {
    console.error('Run npm run merge first to generate ebert-imdb-matched.json');
    process.exit(1);
  }
  const ebert: Array<{ title: string; year: number; imdbId: string }> = JSON.parse(
    fs.readFileSync(matchedPath, 'utf-8')
  );

  console.log(`\n📡 Fetching TMDB details for matched movies...`);
  const tmdbMovies: TmdbMovieDetails[] = [];
  const notFound: Array<{ title: string; year: number }> = [];

  let processed = 0;
  const total = ebert.length;

  for (const review of ebert) {
    processed++;
    if (processed % 500 === 0) {
      console.log(`  Progress: ${processed}/${total} (${tmdbMovies.length} matched)`);
    }

    const imdbId = review.imdbId;

    let tmdbId: number | null = null;
    let details: Record<string, unknown> | null = null;

    if (imdbId) {
      try {
        const found = await tmdbGetMovieByImdbId(imdbId) as { movie_results: unknown[] };
        const match = (found.movie_results ?? [])[0] as Record<string, unknown> | undefined;
        if (match) tmdbId = match.id as number;
      } catch (e) {
        // continue
      }
    }

    if (!tmdbId) {
      notFound.push({ title: review.title, year: review.year });
      continue;
    }

    try {
      details = await tmdbGetMovieDetails(tmdbId) as Record<string, unknown>;
    } catch (e) {
      notFound.push({ title: review.title, year: review.year });
      continue;
    }

    if (!details) continue;

    // Extract flatrate (subscription) watch providers for US
    const watchData = (details['watch/providers'] as Record<string, unknown> | undefined);
    const usProviders = (watchData?.results as Record<string, unknown> | undefined)?.US as Record<string, unknown> | undefined;
    const flatrate = ((usProviders?.flatrate as Array<{ provider_id: number }>) ?? []).map(p => p.provider_id);

    const genres = (details.genres as Array<{ id: number }> ?? []).map(g => g.id);

    tmdbMovies.push({
      tmdbId: details.id as number,
      imdbId: details.imdb_id as string || imdbId || '',
      title: details.title as string,
      year: parseInt(String(details.release_date as string || '').slice(0, 4), 10) || review.year,
      overview: String(details.overview ?? '').slice(0, 400),
      posterPath: details.poster_path as string || '',
      genreIds: genres,
      runtime: details.runtime as number || 0,
      watchProviders: flatrate,
    });
  }

  fs.writeFileSync(tmdbOutPath, JSON.stringify(tmdbMovies, null, 2));
  console.log(`\n✅ Wrote ${tmdbMovies.length} TMDB movies to ${tmdbOutPath}`);
  console.log(`   Not found: ${notFound.length} movies`);
  fs.writeFileSync(path.join(RAW_DIR, 'tmdb-not-found.json'), JSON.stringify(notFound, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
