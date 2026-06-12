function mergeTwoLists(l1: number[], l2: number[]): number[] {
    const mergedList: number[] = [];
    let i = 0, j = 0;

    while (i < l1.length && j < l2.length) {
        if (l1[i] < l2[j]) {
            mergedList.push(l1[i]);
            i++;
        } else {
            mergedList.push(l2[j]);
            j++;
        }
    }

    // Append remaining elements of l1, if any
    while (i < l1.length) {
        mergedList.push(l1[i]);
        i++;
    }

    // Append remaining elements of l2, if any
    while (j < l2.length) {
        mergedList.push(l2[j]);
        j++;
    }

    return mergedList;
}

module.exports = { mergeTwoLists };