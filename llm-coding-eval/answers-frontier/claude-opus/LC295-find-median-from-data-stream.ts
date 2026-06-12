/**
 * Two-heap MedianFinder. A max-heap holds the lower half, a min-heap the
 * upper half; sizes are kept balanced so the median is read from the heap
 * tops in O(1) and insertion is O(log n).
 */
class MinHeap {
  private h: number[] = [];
  size(): number { return this.h.length; }
  peek(): number { return this.h[0]; }
  push(v: number): void {
    this.h.push(v);
    let i = this.h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.h[p] <= this.h[i]) break;
      [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
      i = p;
    }
  }
  pop(): number {
    const top = this.h[0];
    const last = this.h.pop()!;
    if (this.h.length > 0) {
      this.h[0] = last;
      let i = 0;
      const n = this.h.length;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < n && this.h[l] < this.h[smallest]) smallest = l;
        if (r < n && this.h[r] < this.h[smallest]) smallest = r;
        if (smallest === i) break;
        [this.h[smallest], this.h[i]] = [this.h[i], this.h[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

class MedianFinder {
  // lower half stored as negatives in a min-heap → acts as a max-heap
  private lo = new MinHeap();
  private hi = new MinHeap();

  addNum(num: number): void {
    this.lo.push(-num);
    this.hi.push(-this.lo.pop());
    if (this.hi.size() > this.lo.size()) {
      this.lo.push(-this.hi.pop());
    }
  }

  findMedian(): number {
    if (this.lo.size() > this.hi.size()) return -this.lo.peek();
    return (-this.lo.peek() + this.hi.peek()) / 2;
  }
}

module.exports = { MedianFinder };
