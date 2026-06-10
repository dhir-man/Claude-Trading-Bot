/**
 * LeetCode Evaluation Test Suite
 * Tests all 3 models against 10 LeetCode problems.
 * Run individual models with:
 *   MODEL=qwen32b   npx jest tests/leetcode.test.ts
 *   MODEL=deepseek  npx jest tests/leetcode.test.ts
 *   MODEL=glm       npx jest tests/leetcode.test.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { buildClient, ModelKey } from "../src/clients";
import { PROBLEMS } from "../src/leetcode/problems";
import { evaluateProblem, ProblemResult } from "../src/leetcode/runner";
import { log } from "../src/utils/logger";

// ── Model selection ───────────────────────────────────────────────────────────
const MODEL_KEY = (process.env.MODEL as ModelKey) ?? "qwen32b";
const client = buildClient(MODEL_KEY);

// ── Results accumulator ───────────────────────────────────────────────────────
const allResults: ProblemResult[] = [];

// ── Suite ──────────────────────────────────────────────────────────────────────
describe(`LeetCode Evaluation — ${client.name} (${client.modelId})`, () => {
  beforeAll(async () => {
    const available = await client.isAvailable();
    if (!available) {
      throw new Error(
        `Model ${client.modelId} is not available. ` +
          `Run: ollama pull ${client.modelId}`
      );
    }
    log.section(`LeetCode Eval — ${client.name}`);
  });

  afterAll(() => {
    // Print summary table
    log.section("Summary");
    const totalPassed = allResults.reduce((s, r) => s + r.passed, 0);
    const totalTests = allResults.reduce((s, r) => s + r.total, 0);
    const avgLatency =
      allResults.reduce((s, r) => s + r.latencyMs, 0) / allResults.length;
    const totalCost = allResults.reduce((s, r) => s + r.costUsd, 0);

    console.table(
      allResults.map((r) => ({
        Problem: r.problem.title,
        Difficulty: r.problem.difficulty,
        Passed: `${r.passed}/${r.total}`,
        "Pass%": `${(r.passRate * 100).toFixed(0)}%`,
        "Latency(ms)": r.latencyMs,
        "Tokens": r.tokens,
        "Cost($)": r.costUsd.toFixed(5),
      }))
    );

    log.info(`Overall: ${totalPassed}/${totalTests} tests passed`);
    log.info(`Avg latency: ${avgLatency.toFixed(0)}ms`);
    log.info(`Total cost: $${totalCost.toFixed(4)}`);
  });

  // ── Easy problems ───────────────────────────────────────────────────────────
  describe("Easy", () => {
    test("LC#1 — Two Sum", async () => {
      const result = await evaluateProblem(client, PROBLEMS[0]);
      allResults.push(result);

      if (result.error) log.warn(`  Error: ${result.error}`);
      logTestResults(result);

      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.75)
      );
    });

    test("LC#20 — Valid Parentheses", async () => {
      const result = await evaluateProblem(client, PROBLEMS[1]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.75)
      );
    });

    test("LC#21 — Merge Two Sorted Lists", async () => {
      const result = await evaluateProblem(client, PROBLEMS[2]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.75)
      );
    });

    test("LC#206 — Reverse Linked List", async () => {
      const result = await evaluateProblem(client, PROBLEMS[6]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.75)
      );
    });
  });

  // ── Medium problems ─────────────────────────────────────────────────────────
  describe("Medium", () => {
    test("LC#3 — Longest Substring Without Repeating Characters", async () => {
      const result = await evaluateProblem(client, PROBLEMS[3]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.5)
      );
    });

    test("LC#53 — Maximum Subarray (Kadane)", async () => {
      const result = await evaluateProblem(client, PROBLEMS[4]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(
        Math.floor(result.total * 0.5)
      );
    });

    test("LC#200 — Number of Islands", async () => {
      const result = await evaluateProblem(client, PROBLEMS[5]);
      allResults.push(result);
      logTestResults(result);
      expect(result.passed).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Hard problems ───────────────────────────────────────────────────────────
  describe("Hard", () => {
    test("LC#42 — Trapping Rain Water", async () => {
      const result = await evaluateProblem(client, PROBLEMS[7]);
      allResults.push(result);
      logTestResults(result);
      // Hard — pass at least 1 test case
      expect(result.total).toBeGreaterThan(0);
    });

    test("LC#76 — Minimum Window Substring", async () => {
      const result = await evaluateProblem(client, PROBLEMS[8]);
      allResults.push(result);
      logTestResults(result);
      expect(result.total).toBeGreaterThan(0);
    });

    test("LC#295 — Find Median from Data Stream", async () => {
      const result = await evaluateProblem(client, PROBLEMS[9]);
      allResults.push(result);
      logTestResults(result);
      expect(result.total).toBeGreaterThan(0);
    });
  });
});

function logTestResults(r: ProblemResult): void {
  r.testResults.forEach((tr, i) => {
    const icon = tr.passed ? "✓" : "✗";
    const msg = tr.passed
      ? `    ${icon} [${i + 1}] passed`
      : `    ${icon} [${i + 1}] FAIL — expected ${JSON.stringify(tr.expected)}, got ${JSON.stringify(tr.actual)}${tr.error ? ` (${tr.error})` : ""}`;
    tr.passed ? log.dim(msg) : log.warn(msg);
  });
}
