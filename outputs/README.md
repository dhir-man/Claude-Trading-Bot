# Output Files — How to Open and Test Manually

Every test run saves LLM responses and results to this `outputs/` directory. Here is the layout and how to work with each file type.

---

## Directory Layout

```
outputs/
  <model-id>/
    <suite>/            # "leetcode" | "scheduler" | "scheduler-plain-english"
      <slug>/           # problem slug, e.g. "two-sum", "reminder-service"
        response.txt    # raw markdown response from the LLM
        code.ts         # extracted TypeScript code block
        results.json    # structured test results + metrics
      summary.json      # aggregated suite-level stats
```

**Example:**
```
outputs/
  claude-sonnet-4-6/
    leetcode/
      two-sum/
        response.txt
        code.ts
        results.json
      summary.json
    scheduler/
      reminder-service/
        response.txt
        code.ts
        results.json
    scheduler-plain-english/
      reminder-service-plain/
        response.txt
        code.ts
        results.json
```

---

## File Descriptions

### `response.txt`
The raw markdown text returned by the LLM. Open in any text editor or VS Code.
- Contains the full reasoning and code block as the model returned it.
- Useful for understanding *why* the model wrote what it wrote.

### `code.ts`
The TypeScript code extracted from the markdown response.
- Already stripped of the ` ```typescript ``` ` fences.
- Valid TypeScript you can open, edit, and run directly.

### `results.json`
Structured JSON containing:
```json
{
  "model": "claude-sonnet-4-6",
  "suite": "leetcode",
  "slug": "two-sum",
  "timestamp": "2025-06-16T10:00:00.000Z",
  "latencyMs": 1423,
  "tokens": 312,
  "costUsd": 0.00041,
  "passed": 4,
  "total": 4,
  "passRate": 1.0,
  "error": null,
  "testResults": [
    { "passed": true, "input": [[2,7,11,15], 9], "expected": [0,1], "actual": [0,1] }
  ]
}
```

---

## How to Manually Run a Generated Solution

### Option A — Run the code.ts file directly with ts-node

```bash
# Install ts-node if needed
npm install -g ts-node typescript

# Patch the code to call the function and print a result, then run:
cd outputs/<model>/<suite>/<slug>
ts-node code.ts
```

### Option B — Quick Node.js test

Create a small test script:

```js
// test-manual.js
const { twoSum } = require('./code.ts');   // or use ts-node

console.log(twoSum([2, 7, 11, 15], 9));   // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6));         // Expected: [1, 2]
```

Then run:
```bash
npx ts-node test-manual.js
```

### Option C — Open in VS Code and use the Jest extension

1. Open VS Code in the project root: `code .`
2. Install the **Jest** extension (or **vscode-jest**)
3. The test explorer will show all test files under `tests/`
4. Click the **play** button next to any individual test to run just that one

### Option D — Re-run a specific model/test from the CLI

```bash
# Run only the LeetCode suite for Claude
MODEL=claude npx jest tests/leetcode.test.ts --runInBand --verbose

# Run only the Scheduler suite for a specific model
MODEL=claude npx jest tests/scheduler.test.ts --runInBand --verbose

# Run the plain-English scheduler test
MODEL=claude npx jest tests/scheduler-plain-english.test.ts --runInBand --verbose

# Run everything
npm test
```

---

## Reading `summary.json`

Each suite folder contains a `summary.json` aggregating all problems:

```json
{
  "model": "claude-sonnet-4-6",
  "suite": "leetcode",
  "timestamp": "2025-06-16T10:05:00.000Z",
  "totalPassed": 32,
  "totalTests": 37,
  "avgLatencyMs": 1850,
  "totalTokens": 8200,
  "totalCostUsd": 0.00921,
  "problems": [...]
}
```

---

## Tips

- **Compare models**: open multiple `results.json` files side by side in VS Code (`Ctrl+Shift+P → Compare Active File With...`)
- **Diff generated code**: `diff outputs/qwen7b/leetcode/two-sum/code.ts outputs/claude-sonnet-4-6/leetcode/two-sum/code.ts`
- **Spot patterns**: look at `code.ts` files where `"passed": 0` in `results.json` to understand how different models fail
- **Cost tracking**: sum up `costUsd` across `results.json` files to get total spend per model
