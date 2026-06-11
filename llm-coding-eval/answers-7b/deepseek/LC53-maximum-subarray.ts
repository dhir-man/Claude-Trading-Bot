function maxSubArray(nums: number[]): number {
    let currentSum = nums[0];
    let maxSum = nums[0];
    
    for (let i = 1; i < nums.length; i++) {
        // If the current element is greater than the sum of previous elements, start a new subarray from this element
        if(nums[i] > currentSum + nums[i]) {
            currentSum = nums[i];
        } else {
            // Otherwise, extend the existing subarray by adding the current element
            currentSum += nums[i];
        }
        
        // Update max sum if necessary
        if(currentSum > maxSum) {
            maxSum = currentSum;
        }
    }
    
    return maxSum;
}

module.exports = { maxSubArray };