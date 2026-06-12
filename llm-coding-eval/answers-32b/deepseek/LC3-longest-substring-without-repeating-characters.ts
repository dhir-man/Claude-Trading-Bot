function lengthOfLongestSubstring(s: string): number {
    let maxLength = 0;
    let startIndex = 0;
    const charMap = new Map<string, number>();
    
    for (let i = 0; i < s.length; i++) {
        if (charMap.has(s[i])) {
            startIndex = Math.max(startIndex, charMap.get(s[i]) + 1);
        }
        
        maxLength = Math.max(maxLength, i - startIndex + 1);
        charMap.set(s[i], i);
    }
    
    return maxLength;
};

module.exports = { lengthOfLongestSubstring };