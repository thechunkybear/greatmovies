/**
 * Fetch and parse the Siskel-Ebert XLSX dataset from GitHub.
 * Outputs: data/raw/ebert-reviews.json
 *
 * Dataset: https://github.com/Mike-Arnold/Siskel-Ebert
 * Also applies curated great-movies.json overrides.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import type { EbertReview } from './lib/types.js';

const RAW_DIR = path.join(process.cwd(), 'data/raw');
const XLSX_PATH = path.join(RAW_DIR, 'siskel-ebert.xlsx');
const OUT_PATH = path.join(RAW_DIR, 'ebert-reviews.json');
const GREAT_MOVIES_PATH = path.join(process.cwd(), 'data/great-movies.json');

const DATASET_URL =
  'https://github.com/Mike-Arnold/Siskel-Ebert/raw/main/siskel_ebert.xlsx';

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`  Already downloaded: ${path.basename(dest)}`);
      resolve();
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = createWriteStream(dest);
    const get = (u: string) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

async function main() {
  console.log('📥 Downloading Siskel-Ebert dataset...');
  await downloadFile(DATASET_URL, XLSX_PATH);

  console.log('📊 Parsing XLSX...');
  // Dynamic import since xlsx is optional; install if needed
  let XLSX: typeof import('xlsx');
  try {
    const mod = await import('xlsx');
    XLSX = mod.default ?? mod;
  } catch {
    console.error('Run: npm install xlsx');
    process.exit(1);
  }

  const workbook = XLSX.readFile(XLSX_PATH);
  // Sheet is named 'siskel_ebert'
  const sheetName = workbook.SheetNames.find(n => n.includes('siskel') || n.includes('ebert')) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  console.log(`  Sheet: "${sheetName}", Rows found: ${rows.length}`);

  const reviews: EbertReview[] = [];

  for (const row of rows) {
    const title = String(row['Title'] ?? '').trim();
    const yearRaw = row['Year'];
    const year = parseInt(String(yearRaw), 10);

    if (!title || isNaN(year) || year < 1900 || year > 2030) continue;

    // Ebert_star is numeric (3, 3.5, etc.), may be empty string
    let rating = 0;
    const starRaw = row['Ebert_star'];
    if (starRaw !== '' && starRaw !== null && starRaw !== undefined) {
      const n = parseFloat(String(starRaw));
      if (!isNaN(n)) rating = Math.min(4, Math.max(0, n));
    }

    // Ebert_great: non-empty string = it's a Great Movie
    const greatRaw = String(row['Ebert_great'] ?? '').trim();
    const isGreatMovie = greatRaw.length > 0;

    // Ebert_link: review URL
    const linkRaw = String(row['Ebert_link'] ?? '').trim();
    const reviewUrl = linkRaw
      ? (linkRaw.startsWith('http') ? linkRaw : `https://${linkRaw}`)
      : undefined;

    reviews.push({ title, year, rating, isGreatMovie, reviewUrl });
  }

  console.log(`  Parsed ${reviews.length} Ebert reviews`);
  const greatCount = reviews.filter(r => r.isGreatMovie).length;
  console.log(`  Great Movies flagged: ${greatCount}`);

  fs.writeFileSync(OUT_PATH, JSON.stringify(reviews, null, 2));
  console.log(`✅ Wrote ${reviews.length} reviews to ${OUT_PATH}`);
}

function findCol(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  // Partial match fallback
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return undefined;
}

function parseRating(raw: string): number {
  if (!raw) return 0;
  const s = raw.trim();

  // Numeric string "3.5"
  const num = parseFloat(s);
  if (!isNaN(num) && num >= 0 && num <= 4) return num;

  // Star notation "***1/2" or "** 1/2"
  const stars = (s.match(/\*/g) || []).length;
  const half = s.includes('1/2') || s.includes('½') ? 0.5 : 0;
  if (stars > 0) return Math.min(4, stars + half);

  // Fraction strings
  if (s === '1/2') return 0.5;
  if (s.includes('1/2')) return Math.floor(parseFloat(s)) + 0.5;

  return 0;
}

main().catch(e => { console.error(e); process.exit(1); });
