class MedianFinder {
    private maxHeap: number[] = []; // stores smaller half
    private minHeap: number[] = []; // stores larger half
    
    constructor() {}

    addNum(num: number): void {
        if (this.maxHeap.length === 0 || num < this.maxHeap[0]) {
            this.maxHeap.push(num);
            heapify(this.maxHeap, 0, this.maxHeap.length - 1, true); // maintain max heap property
        } else {
            this.minHeap.push(num);
            heapify(this.minHeap, 0, this.minHeap.length - 1, false); // maintain min heap property
        }
        
        if (this.maxHeap.length > this.minHeap.length + 1) {
            let num = this.maxHeap[0];
            heapify(this.maxHeap, 0, this.maxHeap.length - 1, false); // maintain max heap property
            this.minHeap.push(num);
        } else if (this.minHeap.length > this.maxHeap.length) {
            let num = this.minHeap[0];
            heapify(this.minHeap, 0, this.minHeap.length - 1, true); // maintain min heap property
            this.maxHeap.push(num);
        }
    }
    
    findMedian(): number {
        if (this.maxHeap.length === this.minHeap.length) {
            return (this.maxHeap[0] + this.minHeap[0]) / 2; // even numbers of elements, return average of middle two
        } else {
            return this.maxHeap[0]; // odd number of elements, max heap has one more element than min heap
        }
    }
}

function heapify(arr: number[], i: number, n: number, isMaxHeap: boolean): void {
    let largest = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;
    
    if (left <= n && ((isMaxHeap && arr[left] > arr[largest]) || (!isMaxHeap && arr[left] < arr[largest]))) {
        largest = left;
    }
  
    if (right <= n && ((isMaxHeap && arr[right] > arr[largest]) || (!isMaxHeap && arr[right] < arr[largest]))) {
        largest = right;
    }
    
    if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]]; // swap
        heapify(arr, largest, n, isMaxHeap);
    }
}

module.exports = { MedianFinder };