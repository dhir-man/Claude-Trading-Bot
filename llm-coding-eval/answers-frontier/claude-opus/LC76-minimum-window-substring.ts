function minWindow(s: string, t: string): string {
  if (t.length === 0 || s.length < t.length) return "";

  const need = new Map<string, number>();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);

  let required = need.size;
  let formed = 0;
  const windowCounts = new Map<string, number>();

  let left = 0;
  let bestLen = Infinity;
  let bestStart = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    windowCounts.set(ch, (windowCounts.get(ch) ?? 0) + 1);
    if (need.has(ch) && windowCounts.get(ch) === need.get(ch)) formed++;

    while (formed === required) {
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const leftCh = s[left];
      windowCounts.set(leftCh, windowCounts.get(leftCh)! - 1);
      if (need.has(leftCh) && windowCounts.get(leftCh)! < need.get(leftCh)!) {
        formed--;
      }
      left++;
    }
  }

  return bestLen === Infinity ? "" : s.substring(bestStart, bestStart + bestLen);
}

module.exports = { minWindow };
