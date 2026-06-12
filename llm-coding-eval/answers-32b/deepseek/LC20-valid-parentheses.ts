function isValid(s: string): boolean {
    let stack = [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '(' || s[i] === '{' || s[i] === '[') {
            stack.push(s[i]);
        } else {
            let last = stack.pop();
            switch (s[i]) {
                case ')':
                    if (last !== '(') return false;
                    break;
                case '}':
                    if (last !== '{') return false;
                    break;
                case ']':
                    if (last !== '[') return false;
                    break;
            }
        }
    }
    return stack.length === 0;
};
module.exports = { isValid };