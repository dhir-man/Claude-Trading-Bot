function mergeTwoLists(l1: number[], l2: number[]): number[] {
    let mergedList: number[] = [];
    let i = 0;
    let j = 0;

    while (i < l1.length && j < l2.length) {
        if (l1[i] < l2[j]) {
            mergedList.push(l1[i]);
            i++;
        } else {
            mergedList.push(l2[j]);
            j++;
        }
    }

    while (i < l1.length) {
        mergedList.push(l1[i]);
        i++;
    }

    while (j < l2.length) {
        mergedList.push(l2[j]);
        j++;
    }

    return mergedList;
}

module.exports = { mergeTwoLists };