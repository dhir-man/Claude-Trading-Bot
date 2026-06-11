function lengthOfLongestSubstring(s: string): number {
    let n = s.length;
    if (n < 2) return n;
    
    const map = new Map<string, number>();
    let maxLen = 0;
    for (let start = 0, end = 0; end < n; end++) {
        if (map.has(s[end])) {
            start = Math.max(start, map.get(s[end]) as number + 1);
        }
        maxLen = Math.max(maxLen, end - start + 1);
        map.set(s[end], end);
    }
    
    return maxLen;
}

module.exports = { lengthOfLongestSubstring };