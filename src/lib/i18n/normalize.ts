/** Normalize text for forgiving search (case, spacing, quotes, punctuation). */
export function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u1361-\u136B\u1369-\u137C]/g, " ") // Ethiopic punctuation
    .replace(/['"’‘`.,\-–—_()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bounded Levenshtein — early-exits once distance exceeds `max`. */
export function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/**
 * Forgiving word match: exact substring OR small typo tolerance
 * (edit distance scaled by word length).
 */
export function fuzzyWordMatch(haystackWord: string, queryWord: string): boolean {
  if (!queryWord) return true;
  if (haystackWord.includes(queryWord)) return true;
  const tol = queryWord.length <= 3 ? 0 : queryWord.length <= 5 ? 1 : 2;
  if (tol === 0) return false;
  return editDistanceWithin(haystackWord, queryWord, tol);
}

/** Every query word must fuzzy-match at least one haystack word. */
export function fuzzyAllWordsMatch(haystack: string, query: string): boolean {
  const hWords = haystack.split(" ").filter(Boolean);
  const qWords = query.split(" ").filter(Boolean);
  if (!qWords.length) return false;
  return qWords.every((q) => hWords.some((h) => fuzzyWordMatch(h, q)));
}
