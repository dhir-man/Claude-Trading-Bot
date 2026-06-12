function minWindow(s: string, t: string): string {
    if (t.length === 0 || s.length === 0) return "";

    const charCount = new Map<string, number>();
    for (const char of t) {
        charCount.set(char, (charCount.get(char) || 0) + 1);
    }

    let left = 0, right = 0;
    let formed = 0;
    const required = charCount.size;
    const windowCounts = new Map<string, number>();
    let ans: [number, number] | null = null;

    while (right < s.length) {
        const char = s[right];
        windowCounts.set(char, (windowCounts.get(char) || 0) + 1);

        if (charCount.has(char) && windowCounts.get(char) === charCount.get(char)) {
            formed++;
        }

        while (left <= right && formed === required) {
            const char = s[left];

            if (ans === null || right - left + 1 < ans[1] - ans[0]) {
                ans = [left, right + 1];
            }

            windowCounts.set(char, windowCounts.get(char)! - 1);
            if (charCount.has(char) && windowCounts.get(char)! < charCount.get(char)!) {
                formed--;
            }

            left++;
        }

        right++;
    }

    return ans ? s.substring(ans[0], ans[1]) : "";
}

module.exports = { minWindow };