function isValid(s: string): boolean {
    const stack: string[] = [];
    const bracketPairs: { [key: string]: string } = {
        ')': '(',
        '}': '{',
        ']': '['
    };

    for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (char === ')' || char === '}' || char === ']') {
            if (stack.length === 0 || stack.pop() !== bracketPairs[char]) {
                return false;
            }
        }
    }

    return stack.length === 0;
}

module.exports = { isValid }