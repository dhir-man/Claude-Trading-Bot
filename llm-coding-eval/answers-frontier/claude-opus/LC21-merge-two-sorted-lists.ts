function mergeTwoLists(l1: number[], l2: number[]): number[] {
  const merged: number[] = [];
  let i = 0;
  let j = 0;
  while (i < l1.length && j < l2.length) {
    if (l1[i] <= l2[j]) merged.push(l1[i++]);
    else merged.push(l2[j++]);
  }
  while (i < l1.length) merged.push(l1[i++]);
  while (j < l2.length) merged.push(l2[j++]);
  return merged;
}

module.exports = { mergeTwoLists };
