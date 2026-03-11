/**
 * Produce final movies.json + meta.json for the site.
 * Input:  data/raw/ebert-imdb-matched.json
 *         data/raw/tmdb-movies.json
 *         data/raw/tmdb-providers.json
 *         data/raw/imdb-map.json
 * Output: src/data/movies.json
 *         src/data/meta.json
 */

import fs from 'fs';
import path from 'path';
import type { EbertReview, TmdbMovieDetails, TmdbProvider, SiteMovie, SiteMeta, MergedMovie } from './lib/types.js';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
const DATA_DIR = path.join(process.cwd(), 'src/data');

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('📂 Loading data files...');
  const matchedEbert: Array<EbertReview & { imdbId: string }> = JSON.parse(
    fs.readFileSync(path.join(RAW_DIR, 'ebert-imdb-matched.json'), 'utf-8')
  );
  const tmdbMovies: TmdbMovieDetails[] = JSON.parse(
    fs.readFileSync(path.join(RAW_DIR, 'tmdb-movies.json'), 'utf-8')
  );
  const providers: TmdbProvider[] = JSON.parse(
    fs.readFileSync(path.join(RAW_DIR, 'tmdb-providers.json'), 'utf-8')
  );
  const imdbMap: Record<string, { rating?: number }> = JSON.parse(
    fs.readFileSync(path.join(RAW_DIR, 'imdb-map.json'), 'utf-8')
  );

  // Build lookup: imdbId → TmdbMovieDetails
  const tmdbByImdbId = new Map<string, TmdbMovieDetails>();
  for (const m of tmdbMovies) {
    if (m.imdbId) tmdbByImdbId.set(m.imdbId, m);
  }

  // Build lookup: imdbId → EbertReview
  const ebertByImdbId = new Map<string, EbertReview & { imdbId: string }>();
  for (const r of matchedEbert) {
    ebertByImdbId.set(r.imdbId, r);
  }

  console.log(`  Ebert reviews: ${matchedEbert.length}`);
  console.log(`  TMDB movies: ${tmdbMovies.length}`);
  console.log(`  Providers: ${providers.length}`);

  // Merge
  const movies: SiteMovie[] = [];
  const genreSet = new Map<number, string>();
  const serviceSet = new Map<number, TmdbProvider>();
  const decadeSet = new Set<number>();

  for (const ebert of matchedEbert) {
    const tmdb = tmdbByImdbId.get(ebert.imdbId);
    if (!tmdb) continue; // skip if no TMDB match

    const imdb = imdbMap[ebert.imdbId];
    const decade = Math.floor(tmdb.year / 10) * 10;
    decadeSet.add(decade);

    // Track genres
    for (const gId of tmdb.genreIds) {
      if (!genreSet.has(gId)) {
        // We'll resolve genre names from a separate TMDB genres call, or use IDs for now
        genreSet.set(gId, '');
      }
    }

    // Track services
    for (const sId of tmdb.watchProviders) {
      if (!serviceSet.has(sId)) {
        const p = providers.find(p => p.id === sId);
        if (p) serviceSet.set(sId, p);
      }
    }

    const movie: SiteMovie = {
      id: tmdb.tmdbId,
      t: tmdb.title,
      y: tmdb.year,
      g: tmdb.genreIds,
      o: tmdb.overview.slice(0, 300),
      p: tmdb.posterPath,
      r: tmdb.runtime,
      s: tmdb.watchProviders,
      cr: {
        ebert: {
          r: Math.round(ebert.rating * 2), // 0–8
          g: ebert.isGreatMovie,
          u: ebert.reviewUrl,
        },
      },
    };

    if (imdb?.rating) {
      movie.imdb = imdb.rating;
    }

    movies.push(movie);
  }

  console.log(`\n  Merged ${movies.length} movies`);

  // Fetch genre names from TMDB (use cached or hardcoded)
  const knownGenres: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  };

  const genres = [...genreSet.keys()]
    .filter(id => knownGenres[id])
    .map(id => ({ id, name: knownGenres[id] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const decades = [...decadeSet].sort((a, b) => a - b);

  const services = [...serviceSet.entries()]
    .map(([id, p]) => ({ id, name: p.name, logo: p.logoPath }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const meta: SiteMeta = {
    genres,
    decades,
    services,
    critics: [
      {
        key: 'ebert',
        name: 'Roger Ebert',
        maxRating: 4,
        ratingStep: 0.5,
        hasDesignation: true,
        designationLabel: 'Great Movie',
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  // Sort movies by Ebert rating desc, then year desc
  movies.sort((a, b) => {
    const ra = a.cr?.ebert?.r ?? 0;
    const rb = b.cr?.ebert?.r ?? 0;
    if (rb !== ra) return rb - ra;
    return b.y - a.y;
  });

  const moviesPath = path.join(DATA_DIR, 'movies.json');
  const metaPath = path.join(DATA_DIR, 'meta.json');

  fs.writeFileSync(moviesPath, JSON.stringify(movies));
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  // Also copy to public/data/ for static serving (avoids inlining into HTML)
  const publicDataDir = path.join(process.cwd(), 'public/data');
  fs.mkdirSync(publicDataDir, { recursive: true });
  fs.copyFileSync(moviesPath, path.join(publicDataDir, 'movies.json'));
  fs.copyFileSync(metaPath, path.join(publicDataDir, 'meta.json'));

  const moviesSize = fs.statSync(moviesPath).size;
  console.log(`\n✅ movies.json: ${(moviesSize / 1024).toFixed(0)} KB (${movies.length} movies)`);
  console.log(`   meta.json: ${genres.length} genres, ${decades.length} decades, ${services.length} services`);
  console.log(`\n🎬 Sample movies:`);
  movies.slice(0, 5).forEach(m => {
    const ebertR = m.cr?.ebert?.r ?? 0;
    console.log(`  ${m.t} (${m.y}) — Ebert: ${(ebertR / 2).toFixed(1)}★${m.cr?.ebert?.g ? ' [Great Movie]' : ''}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
