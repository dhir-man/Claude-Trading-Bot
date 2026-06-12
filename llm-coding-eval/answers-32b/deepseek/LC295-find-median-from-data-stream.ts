class MedianFinder {
    private nums: number[];
    
    constructor() {
        this.nums = [];
    }

    addNum(num: number): void {
        let index = 0;
        
        while (index < this.nums.length && this.nums[index] < num) {
            index++;
        }
        
        this.nums.splice(index, 0, num);
    }

    findMedian(): number {
        const mid = Math.floor(this.nums.length / 2);
        
        if (this.nums.length % 2 === 0) {
            return (this.nums[mid - 1] + this.nums[mid]) / 2;
        } else {
            return this.nums[mid];
        }
    }
}

module.exports = { MedianFinder };