class MedianFinder {
    private minHeap: number[] = [];
    private maxHeap: number[] = [];

    constructor() {}

    private swap(arr: number[], i: number, j: number): void {
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    private heapifyUp(heap: number[], index: number): void {
        let parentIndex = Math.floor((index - 1) / 2);
        while (index > 0 && heap[index] < heap[parentIndex]) {
            this.swap(heap, index, parentIndex);
            index = parentIndex;
            parentIndex = Math.floor((index - 1) / 2);
        }
    }

    private heapifyDown(heap: number[], index: number): void {
        let leftChildIndex = 2 * index + 1;
        let rightChildIndex = 2 * index + 2;
        let smallestIndex = index;

        if (leftChildIndex < heap.length && heap[leftChildIndex] < heap[smallestIndex]) {
            smallestIndex = leftChildIndex;
        }

        if (rightChildIndex < heap.length && heap[rightChildIndex] < heap[smallestIndex]) {
            smallestIndex = rightChildIndex;
        }

        if (smallestIndex !== index) {
            this.swap(heap, index, smallestIndex);
            this.heapifyDown(heap, smallestIndex);
        }
    }

    private addNumToHeap(heap: number[], num: number): void {
        heap.push(num);
        this.heapifyUp(heap, heap.length - 1);
    }

    private removeMinFromHeap(heap: number[]): number {
        if (heap.length === 0) throw new Error("Heap is empty");
        const min = heap[0];
        const end = heap.pop()!;
        if (heap.length > 0) {
            heap[0] = end;
            this.heapifyDown(heap, 0);
        }
        return min;
    }

    addNum(num: number): void {
        if (this.maxHeap.length === 0 || num <= -this.maxHeap[0]) {
            this.addNumToHeap(this.maxHeap, -num);
        } else {
            this.addNumToHeap(this.minHeap, num);
        }

        if (this.maxHeap.length > this.minHeap.length + 1) {
            const max = -this.removeMinFromHeap(this.maxHeap);
            this.addNumToHeap(this.minHeap, max);
        } else if (this.minHeap.length > this.maxHeap.length) {
            const min = this.removeMinFromHeap(this.minHeap);
            this.addNumToHeap(this.maxHeap, -min);
        }
    }

    findMedian(): number {
        if (this.maxHeap.length === 0 && this.minHeap.length === 0) throw new Error("No numbers added");
        if (this.maxHeap.length > this.minHeap.length) {
            return -this.maxHeap[0];
        } else if (this.minHeap.length > this.maxHeap.length) {
            return this.minHeap[0];
        } else {
            return (-this.maxHeap[0] + this.minHeap[0]) / 2;
        }
    }
}

module.exports = { MedianFinder };