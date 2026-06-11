function minWindow(s: string, t: string): string {
    if (t.length > s.length) return "";
    
    let left = 0;
    let right = 0;
    const map = new Map<string, number>();
    for (let char of t) {
        map.set(char, (map.get(char) || 0) + 1);
    }
    
    let count = map.size;
    let minLen = Infinity;
    let start = 0;
    
    while (right < s.length) {
        const rightChar = s[right];
        if (map.has(rightChar)) {
            map.set(rightChar, map.get(rightChar)! - 1);
            if (map.get(rightChar)! === 0) count--;
        }
        
        while (count === 0) {
            if (right - left + 1 < minLen) {
                start = left;
                minLen = right - left + 1;
            }
            
            const leftChar = s[left];
            if (map.has(leftChar)) {
                map.set(leftChar, map.get(leftChar)! + 1);
                if (map.get(leftChar)! > 0) count++;
            }
            left++;
        }
        
        right++;
    }
    
    return minLen === Infinity ? "" : s.substring(start, start + minLen);
}

module.exports = { minWindow };