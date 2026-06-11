function minWindow(s: string, t: string): string {
    const need: { [key: string]: number } = {};
    const window: { [key: string]: number } = {};
    let left = 0, right = 0;
    let valid = 0;
    let start = 0, len = Infinity;

    for (let char of t) {
        need[char] = (need[char] || 0) + 1;
    }

    while (right < s.length) {
        const c = s[right];
        right++;
        if (need[c]) {
            window[c] = (window[c] || 0) + 1;
            if (window[c] === need[c]) {
                valid++;
            }
        }

        while (valid === Object.keys(need).length) {
            if (right - left < len) {
                start = left;
                len = right - left;
            }
            const d = s[left];
            left++;
            if (need[d]) {
                if (window[d] === need[d]) {
                    valid--;
                }
                window[d]--;
            }
        }
    }

    return len === Infinity ? "" : s.substring(start, start + len);
}

module.exports = { minWindow };