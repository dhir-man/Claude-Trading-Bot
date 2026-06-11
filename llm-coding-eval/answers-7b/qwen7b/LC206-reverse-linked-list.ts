function reverseList(head: number[]): number[] {
    let prev: number[] | null = null;
    let current: number[] | null = head;

    while (current !== null) {
        const nextTemp = current.slice(1);
        current[0] = prev ? prev[0] : undefined;
        prev = current;
        current = nextTemp;
    }

    return prev || [];
}

module.exports = { reverseList };