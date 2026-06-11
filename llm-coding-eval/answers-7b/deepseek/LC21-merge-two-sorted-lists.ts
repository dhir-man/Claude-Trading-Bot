function mergeTwoLists(l1: number[], l2: number[]): number[] {
    let result: number[] = [];
    while (l1.length && l2.length) {
        if (l1[0] < l2[0]) {
            result.push(l1.shift() as number);
        } else {
            result.push(l2.shift() as number);
        }
    }
    while (l1.length) {
        result.push(l1.shift() as number);
    }
    while (l2.length) {
        result.push(l2.shift() as number);
    }
    return result;
}
module.exports = { mergeTwoLists };