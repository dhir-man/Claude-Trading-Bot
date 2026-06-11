class MedianFinder {
    private nums: number[] = [];

    constructor() {}

    addNum(num: number): void {
        this.nums.push(num);
        this.nums.sort((a, b) => a - b);
    }

    findMedian(): number {
        const n = this.nums.length;
        if (n % 2 === 1) {
            return this.nums[Math.floor(n / 2)];
        } else {
            return (this.nums[n / 2 - 1] + this.nums[n / 2]) / 2;
        }
    }
}

module.exports = { MedianFinder };