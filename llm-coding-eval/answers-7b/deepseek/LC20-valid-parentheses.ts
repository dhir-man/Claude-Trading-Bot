function isValid(s: string): boolean {
    let stack = [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(' || s[i] === '{' || s[i] === '[') {
            stack.push(s[i]);
        } else {
            if (!stack.length) return false;  // If there's a closing bracket without an opening one, it's invalid
            
            let lastOpenBracket = stack.pop();
            if (s[i] === ')' && lastOpenBracket !== '(' || s[i] === '}' && lastOpenBracket !== '{' || s[i] === ']' && lastOpenBracket !== '[') {
                return false;  // If the closing bracket doesn't match with the opening one, it's invalid
            }
        }
    }
    
    return stack.length === 0;  // If there are unmatched opening brackets, they're invalid
}

module.exports = { isValid };