class MedianFinder {
    private lowerHalf: number[];
    private upperHalf: number[];

    constructor() {
        this.lowerHalf = [];
        this.upperHalf = [];
    }

    addNum(num: number): void {
        if (this.lowerHalf.length === 0 || num <= -this.lowerHalf[0]) {
            this.insertIntoMaxHeap(this.lowerHalf, num);
        } else {
            this.insertIntoMinHeap(this.upperHalf, num);
        }

        // Balance the heaps
        if (this.lowerHalf.length > this.upperHalf.length + 1) {
            this.insertIntoMinHeap(this.upperHalf, -this.removeRootFromMaxHeap(this.lowerHalf));
        } else if (this.upperHalf.length > this.lowerHalf.length) {
            this.insertIntoMaxHeap(this.lowerHalf, -this.removeRootFromMinHeap(this.upperHalf));
        }
    }

    findMedian(): number {
        if (this.lowerHalf.length > this.upperHalf.length) {
            return -this.lowerHalf[0];
        } else {
            return (-this.lowerHalf[0] + this.upperHalf[0]) / 2;
        }
    }

    private insertIntoMaxHeap(heap: number[], num: number): void {
        heap.push(num);
        let index = heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (heap[index] <= heap[parentIndex]) break;
            [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
            index = parentIndex;
        }
    }

    private insertIntoMinHeap(heap: number[], num: number): void {
        heap.push(num);
        let index = heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (heap[index] >= heap[parentIndex]) break;
            [heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]];
            index = parentIndex;
        }
    }

    private removeRootFromMaxHeap(heap: number[]): number {
        const root = heap[0];
        heap[0] = heap.pop()!;
        let index = 0;
        while (true) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let largestIndex = index;

            if (leftChildIndex < heap.length && heap[leftChildIndex] > heap[largestIndex]) {
                largestIndex = leftChildIndex;
            }
            if (rightChildIndex < heap.length && heap[rightChildIndex] > heap[largestIndex]) {
                largestIndex = rightChildIndex;
            }

            if (largestIndex === index) break;

            [heap[index], heap[largestIndex]] = [heap[largestIndex], heap[index]];
            index = largestIndex;
        }
        return root;
    }

    private removeRootFromMinHeap(heap: number[]): number {
        const root = heap[0];
        heap[0] = heap.pop()!;
        let index = 0;
        while (true) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let smallestIndex = index;

            if (leftChildIndex < heap.length && heap[leftChildIndex] < heap[smallestIndex]) {
                smallestIndex = leftChildIndex;
            }
            if (rightChildIndex < heap.length && heap[rightChildIndex] < heap[smallestIndex]) {
                smallestIndex = rightChildIndex;
            }

            if (smallestIndex === index) break;

            [heap[index], heap[smallestIndex]] = [heap[smallestIndex], heap[index]];
            index = smallestIndex;
        }
        return root;
    }
}

module.exports = { MedianFinder };