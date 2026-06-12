function minWindow(s: string, t: string): string {
    if (t.length > s.length) return "";

    const charCount = (str: string): Map<string, number> => {
        const map = new Map<string, number>();
        for (const char of str) {
            map.set(char, (map.get(char) || 0) + 1);
        }
        return map;
    };

    const tMap = charCount(t);
    let required = tMap.size;
    let formed = 0;

    let left = 0, right = 0;
    let ans: [number, number] | null = null;

    while (right < s.length) {
        const char = s[right];
        if (tMap.has(char)) {
            tMap.set(char, tMap.get(char)! - 1);
            if (tMap.get(char)! === 0) formed++;
        }

        while (left <= right && formed === required) {
            const [start, end] = ans || [0, Infinity];
            if (right - left + 1 < end - start) {
                ans = [left, right + 1];
            }

            const leftChar = s[left];
            if (tMap.has(leftChar)) {
                tMap.set(leftChar, tMap.get(leftChar)! + 1);
                if (tMap.get(leftChar)! > 0) formed--;
            }
            left++;
        }

        right++;
    }

    return ans ? s.substring(ans[0], ans[1]) : "";
}

module.exports = { minWindow };