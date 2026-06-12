function reverseList(head: number[]): number[] {
    let prev = null;
    let current = head;

    while (current !== null) {
        const next = current.slice(1);
        current[0] = prev;
        prev = current;
        current = next.length > 0 ? [next[0]] : null;
    }

    return prev || [];
}

module.exports = { reverseList };