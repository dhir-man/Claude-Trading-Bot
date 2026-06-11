function twoSum(nums: number[], target: number): number[] {
    let numMap = {};  // Hash Map to store each element's complement and its index
    
    for (let i = 0; i < nums.length; i++) {
        let complement = target - nums[i];  
        
        if(complement in numMap) {
            return [numMap[complement], i]  // If we find a match, return the indices of these two numbers
        } else {
            numMap[nums[i]] = i;  // Store current element's complement and its index
        }
    }
    
    throw new Error("No solution found!");   // Throw an error if no valid answer exists.
}

module.exports = { twoSum };