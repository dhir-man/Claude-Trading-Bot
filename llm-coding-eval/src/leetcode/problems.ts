export interface TestCase {
  input: unknown[];
  expected: unknown;
  description?: string;
}

export interface LeetCodeProblem {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  functionName: string;
  prompt: string;
  testCases: TestCase[];
  /** Expected TypeScript function signature shown to the model */
  signature: string;
}

export const PROBLEMS: LeetCodeProblem[] = [
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    id: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array / Hash Map",
    functionName: "twoSum",
    signature: "function twoSum(nums: number[], target: number): number[]",
    prompt: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`. Each input has exactly one solution and you may not use the same element twice. Return the answer in any order.

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.

Example:
  Input: nums = [2,7,11,15], target = 9
  Output: [0,1]  // nums[0] + nums[1] == 9

Write a TypeScript function: ${`function twoSum(nums: number[], target: number): number[]`}
Export it as: module.exports = { twoSum }`,
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    ],
  },

  {
    id: 20,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack / String",
    functionName: "isValid",
    signature: "function isValid(s: string): boolean",
    prompt: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Write a TypeScript function: function isValid(s: string): boolean
Export it as: module.exports = { isValid }`,
    testCases: [
      { input: ["()"], expected: true },
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["([)]"], expected: false },
      { input: ["{[]}"], expected: true },
      { input: [""], expected: true },
    ],
  },

  {
    id: 21,
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    category: "Linked List",
    functionName: "mergeTwoLists",
    signature:
      "function mergeTwoLists(l1: number[] | null, l2: number[] | null): number[]",
    prompt: `You are given the heads of two sorted linked lists. Merge the two lists into one sorted list and return it.

For this implementation, represent linked lists as sorted arrays of numbers (for simplicity in testing).

Write a TypeScript function:
  function mergeTwoLists(l1: number[], l2: number[]): number[]

that merges two sorted arrays into one sorted array.

Example:
  Input: l1 = [1,2,4], l2 = [1,3,4]
  Output: [1,1,2,3,4,4]

Export it as: module.exports = { mergeTwoLists }`,
    testCases: [
      { input: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { input: [[], []], expected: [] },
      { input: [[], [0]], expected: [0] },
      { input: [[5], [1, 2, 3, 4]], expected: [1, 2, 3, 4, 5] },
    ],
  },

  // ── Medium ────────────────────────────────────────────────────────────────
  {
    id: 3,
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Sliding Window / Hash Map",
    functionName: "lengthOfLongestSubstring",
    signature: "function lengthOfLongestSubstring(s: string): number",
    prompt: `Given a string \`s\`, find the length of the longest substring without repeating characters.

Constraints:
- 0 <= s.length <= 5 * 10^4
- s consists of English letters, digits, symbols and spaces.

Write a TypeScript function: function lengthOfLongestSubstring(s: string): number
Export it as: module.exports = { lengthOfLongestSubstring }`,
    testCases: [
      { input: ["abcabcbb"], expected: 3, description: '"abc"' },
      { input: ["bbbbb"], expected: 1, description: '"b"' },
      { input: ["pwwkew"], expected: 3, description: '"wke"' },
      { input: [""], expected: 0 },
      { input: [" "], expected: 1 },
      { input: ["dvdf"], expected: 3 },
    ],
  },

  {
    id: 53,
    slug: "maximum-subarray",
    title: "Maximum Subarray (Kadane's Algorithm)",
    difficulty: "Medium",
    category: "Dynamic Programming",
    functionName: "maxSubArray",
    signature: "function maxSubArray(nums: number[]): number",
    prompt: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4

Use Kadane's algorithm for O(n) time.

Write a TypeScript function: function maxSubArray(nums: number[]): number
Export it as: module.exports = { maxSubArray }`,
    testCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
      { input: [[-1, -2, -3]], expected: -1 },
    ],
  },

  {
    id: 200,
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    category: "Graph / BFS / DFS",
    functionName: "numIslands",
    signature: "function numIslands(grid: string[][]): number",
    prompt: `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.

Write a TypeScript function: function numIslands(grid: string[][]): number
Export it as: module.exports = { numIslands }`,
    testCases: [
      {
        input: [
          [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        ],
        expected: 1,
      },
      {
        input: [
          [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        ],
        expected: 3,
      },
    ],
  },

  {
    id: 206,
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "Easy",
    category: "Linked List",
    functionName: "reverseList",
    signature: "function reverseList(head: number[]): number[]",
    prompt: `Given the head of a singly linked list (represented as an array), reverse the list, and return the reversed list.

Write a TypeScript function: function reverseList(head: number[]): number[]
Export it as: module.exports = { reverseList }`,
    testCases: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
      { input: [[1, 2]], expected: [2, 1] },
      { input: [[]], expected: [] },
    ],
  },

  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    id: 42,
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    category: "Two Pointers / Stack",
    functionName: "trap",
    signature: "function trap(height: number[]): number",
    prompt: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

Constraints:
- n == height.length
- 1 <= n <= 2 * 10^4
- 0 <= height[i] <= 10^5

Write an O(n) time, O(1) space solution.

Write a TypeScript function: function trap(height: number[]): number
Export it as: module.exports = { trap }`,
    testCases: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { input: [[1, 0, 1]], expected: 1 },
      { input: [[3, 0, 0, 2, 0, 4]], expected: 10 },
    ],
  },

  {
    id: 76,
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    category: "Sliding Window",
    functionName: "minWindow",
    signature: "function minWindow(s: string, t: string): string",
    prompt: `Given two strings s and t of lengths m and n respectively, return the minimum window substring of s such that every character in t (including duplicates) is included in the window. If there is no such substring, return the empty string "".

The test cases are generated such that the answer is unique.

Write a TypeScript function: function minWindow(s: string, t: string): string
Export it as: module.exports = { minWindow }`,
    testCases: [
      { input: ["ADOBECODEBANC", "ABC"], expected: "BANC" },
      { input: ["a", "a"], expected: "a" },
      { input: ["a", "aa"], expected: "" },
      { input: ["aa", "aa"], expected: "aa" },
    ],
  },

  {
    id: 295,
    slug: "find-median-from-data-stream",
    title: "Find Median from Data Stream",
    difficulty: "Hard",
    category: "Heap / Design",
    functionName: "MedianFinder",
    signature: "class MedianFinder { addNum(n: number): void; findMedian(): number }",
    prompt: `Implement the MedianFinder class:
- MedianFinder() initializes the MedianFinder object.
- void addNum(int num) adds the integer num from the data stream to the data structure.
- double findMedian() returns the median of all elements so far.

The median is the middle value in an ordered integer list. If the size is even, return the mean of the two middle values.

Write a TypeScript class: MedianFinder with addNum(num: number): void and findMedian(): number
Export it as: module.exports = { MedianFinder }`,
    testCases: [
      {
        input: [[[1], [2], [3]]],
        expected: [null, null, 2.0],
        description: "add 1, add 2, findMedian=1.5, add 3, findMedian=2",
      },
    ],
  },
];

export function getProblemBySlug(slug: string): LeetCodeProblem | undefined {
  return PROBLEMS.find((p) => p.slug === slug);
}

export function getProblemsByDifficulty(
  d: "Easy" | "Medium" | "Hard"
): LeetCodeProblem[] {
  return PROBLEMS.filter((p) => p.difficulty === d);
}
