/**
 * Run the full data pipeline end-to-end.
 * Usage: npm run pipeline
 */

import { execSync } from 'child_process';

const steps = [
  { name: 'Ebert reviews',    cmd: 'npm run fetch:ebert' },
  { name: 'IMDB data',        cmd: 'npm run fetch:imdb' },
  { name: 'Match Ebert→IMDB', cmd: 'npm run merge' },
  { name: 'TMDB details',     cmd: 'npm run fetch:tmdb' },
  { name: 'Build site data',  cmd: 'npm run build:data' },
];

console.log('🚀 Running full data pipeline\n');
const start = Date.now();

for (const step of steps) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${step.name}`);
  console.log('─'.repeat(60));
  const t = Date.now();
  try {
    execSync(step.cmd, { stdio: 'inherit' });
    console.log(`✅ Done in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error(`❌ Failed: ${step.name}`);
    process.exit(1);
  }
}

const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
console.log(`\n${'═'.repeat(60)}`);
console.log(`🎉 Pipeline complete in ${elapsed} minutes`);
