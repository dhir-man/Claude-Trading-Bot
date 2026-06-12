function reverseList(head: number[]): number[] {
  const reversed: number[] = [];
  for (let i = head.length - 1; i >= 0; i--) {
    reversed.push(head[i]);
  }
  return reversed;
}

module.exports = { reverseList };
