/**
 * Title normalization and matching utilities.
 */

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    // Move leading "The ", "A ", "An " to end (e.g. "The Godfather" → "godfather, the")
    .replace(/^(the|a|an) (.+)$/, '$2, $1')
    .replace(/[^\w\s,]/g, '')  // remove punctuation except comma
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleMatchScore(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1.0;

  // Levenshtein-based similarity
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  return 1 - dist / maxLen;
}

export function yearClose(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
