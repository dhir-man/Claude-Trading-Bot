function isValid(s: string): boolean {
    const stack: string[] = [];
    const mapping: { [key: string]: string } = {
        ')': '(',
        '}': '{',
        ']': '['
    };

    for (const char of s) {
        if (mapping[char]) {
            const topElement = stack.length === 0 ? '#' : stack.pop()!;
            if (mapping[char] !== topElement) {
                return false;
            }
        } else {
            stack.push(char);
        }
    }

    return stack.length === 0;
}

module.exports = { isValid };