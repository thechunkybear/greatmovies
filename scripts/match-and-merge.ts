/**
 * Join Ebert → IMDB → TMDB
 * Input:  data/raw/ebert-reviews.json
 *         data/raw/imdb-map.json
 * Output: data/raw/ebert-imdb-matched.json  (ebert reviews with imdbId attached)
 *         data/raw/match-report.json
 */

import fs from 'fs';
import path from 'path';
import { normalizeTitle, titleMatchScore, yearClose } from './lib/matching.js';
import type { EbertReview, ImdbEntry } from './lib/types.js';

const RAW_DIR = path.join(process.cwd(), 'data/raw');

interface MatchedReview extends EbertReview {
  imdbId: string;
  matchScore: number;
}

async function main() {
  const ebertPath = path.join(RAW_DIR, 'ebert-reviews.json');
  const imdbMapPath = path.join(RAW_DIR, 'imdb-map.json');

  if (!fs.existsSync(ebertPath)) { console.error('Run fetch:ebert first'); process.exit(1); }
  if (!fs.existsSync(imdbMapPath)) { console.error('Run fetch:imdb first'); process.exit(1); }

  const ebert: EbertReview[] = JSON.parse(fs.readFileSync(ebertPath, 'utf-8'));
  const imdbMap: Record<string, ImdbEntry> = JSON.parse(fs.readFileSync(imdbMapPath, 'utf-8'));

  console.log(`Matching ${ebert.length} Ebert reviews to ${Object.keys(imdbMap).length} IMDB movies...`);

  // Build index: normalized title → list of IMDB entries
  console.log('Building IMDB title index...');
  const titleIndex = new Map<string, ImdbEntry[]>();
  for (const entry of Object.values(imdbMap)) {
    const key = normalizeTitle(entry.title);
    const arr = titleIndex.get(key) ?? [];
    arr.push(entry);
    titleIndex.set(key, arr);
  }

  const matched: MatchedReview[] = [];
  const unmatched: EbertReview[] = [];

  for (const review of ebert) {
    const normalizedTitle = normalizeTitle(review.title);

    // Exact title match candidates
    let candidates = titleIndex.get(normalizedTitle) ?? [];

    // Fuzzy fallback: check entries with similar titles
    if (candidates.length === 0) {
      // Check partial — take first word match
      const firstWord = normalizedTitle.split(' ')[0];
      if (firstWord.length > 3) {
        const fuzzy: ImdbEntry[] = [];
        for (const [key, entries] of titleIndex) {
          if (key.startsWith(firstWord) || key.includes(firstWord)) {
            fuzzy.push(...entries);
          }
        }
        candidates = fuzzy;
      }
    }

    // Score candidates
    let bestMatch: ImdbEntry | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const titleScore = titleMatchScore(review.title, candidate.title);
      if (titleScore < 0.8) continue;

      const yearOk = yearClose(review.year, candidate.year, 1);
      if (!yearOk) continue;

      const score = titleScore + (review.year === candidate.year ? 0.2 : 0.1);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch && bestScore >= 0.9) {
      matched.push({ ...review, imdbId: bestMatch.imdbId, matchScore: bestScore });
    } else {
      unmatched.push(review);
    }
  }

  console.log(`\n✅ Matched: ${matched.length} / ${ebert.length}`);
  console.log(`   Unmatched: ${unmatched.length}`);

  const matchRate = ((matched.length / ebert.length) * 100).toFixed(1);
  console.log(`   Match rate: ${matchRate}%`);

  fs.writeFileSync(
    path.join(RAW_DIR, 'ebert-imdb-matched.json'),
    JSON.stringify(matched, null, 2)
  );
  fs.writeFileSync(
    path.join(RAW_DIR, 'ebert-imdb-unmatched.json'),
    JSON.stringify(unmatched, null, 2)
  );

  const report = {
    total: ebert.length,
    matched: matched.length,
    unmatched: unmatched.length,
    matchRate: parseFloat(matchRate),
    unmatchedSample: unmatched.slice(0, 20).map(r => `${r.title} (${r.year})`),
  };
  fs.writeFileSync(path.join(RAW_DIR, 'match-report.json'), JSON.stringify(report, null, 2));

  console.log('\nSample unmatched:');
  unmatched.slice(0, 10).forEach(r => console.log(`  ${r.title} (${r.year})`));
}

main().catch(e => { console.error(e); process.exit(1); });
