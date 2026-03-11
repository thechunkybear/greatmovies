/**
 * Download and parse IMDB bulk datasets.
 * Uses: title.basics.tsv.gz + title.ratings.tsv.gz
 * Outputs: data/raw/imdb-map.json  (imdbId → ImdbEntry)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import readline from 'readline';
import { createWriteStream } from 'fs';
import type { ImdbEntry } from './lib/types.js';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
const OUT_PATH = path.join(RAW_DIR, 'imdb-map.json');

const FILES = {
  basics: {
    url: 'https://datasets.imdbws.com/title.basics.tsv.gz',
    local: path.join(RAW_DIR, 'title.basics.tsv.gz'),
  },
  ratings: {
    url: 'https://datasets.imdbws.com/title.ratings.tsv.gz',
    local: path.join(RAW_DIR, 'title.ratings.tsv.gz'),
  },
};

async function downloadFile(url: string, dest: string) {
  if (fs.existsSync(dest)) {
    console.log(`  Already downloaded: ${path.basename(dest)}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  console.log(`  Downloading ${path.basename(dest)}...`);
  return new Promise<void>((resolve, reject) => {
    const file = createWriteStream(dest);
    const get = (u: string) => {
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) { get(res.headers.location!); return; }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', reject);
    };
    get(url);
  });
}

async function parseTsvGz<T>(
  filePath: string,
  handler: (headers: string[], values: string[]) => T | null
): Promise<T[]> {
  const results: T[] = [];
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream });
  let headers: string[] = [];
  let first = true;
  for await (const line of rl) {
    const cols = line.split('\t');
    if (first) { headers = cols; first = false; continue; }
    const item = handler(headers, cols);
    if (item !== null) results.push(item);
  }
  return results;
}

async function main() {
  console.log('📥 Downloading IMDB datasets...');
  await downloadFile(FILES.basics.url, FILES.basics.local);
  await downloadFile(FILES.ratings.url, FILES.ratings.local);

  console.log('📊 Parsing title.basics.tsv.gz...');
  const basics = new Map<string, ImdbEntry>();

  await parseTsvGz(FILES.basics.local, (headers, cols) => {
    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    // Only movies
    if (row.titleType !== 'movie') return null;
    const imdbId = row.tconst;
    const title = row.primaryTitle || row.originalTitle;
    const year = parseInt(row.startYear, 10);
    const runtime = parseInt(row.runtimeMinutes, 10);
    const genres = row.genres && row.genres !== '\\N' ? row.genres.split(',') : [];

    if (!imdbId || !title || isNaN(year)) return null;

    basics.set(imdbId, {
      imdbId,
      title,
      year,
      genres,
      runtime: isNaN(runtime) ? 0 : runtime,
    });
    return null; // we use the map, not the array
  });

  console.log(`  Parsed ${basics.size} movies from basics`);

  console.log('📊 Parsing title.ratings.tsv.gz...');
  let ratingsAdded = 0;
  await parseTsvGz(FILES.ratings.local, (headers, cols) => {
    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    const entry = basics.get(row.tconst);
    if (entry) {
      const rating = parseFloat(row.averageRating);
      if (!isNaN(rating)) {
        entry.rating = Math.round(rating * 10); // 0–100
        ratingsAdded++;
      }
    }
    return null;
  });

  console.log(`  Added ratings to ${ratingsAdded} movies`);

  const map = Object.fromEntries(basics);
  fs.writeFileSync(OUT_PATH, JSON.stringify(map));
  console.log(`✅ Wrote IMDB map (${basics.size} movies) to ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
