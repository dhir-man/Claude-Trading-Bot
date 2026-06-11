/**
 * Runs a SAVED model answer file against its test cases.
 *
 *   npx ts-node src/run-answer.ts <path-to-answer.ts>
 *
 * Examples:
 *   npx ts-node src/run-answer.ts answers-7b/qwen7b/LC1-two-sum.ts
 *   npx ts-node src/run-answer.ts answers-32b/deepseek/scheduler-ReminderService.ts
 *
 * For a LeetCode answer it infers the problem from the filename (LC<id>-<slug>.ts),
 * runs every test case, and prints expected vs actual per case.
 * For the scheduler answer it runs the 26-check ReminderService harness.
 */
import * as fs from "fs";
import * as path from "path";
import { PROBLEMS } from "./leetcode/problems";
import { evalCode } from "./utils/extract-code";
import { runSchedulerTests } from "./run-eval";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...(a as number[])].sort();
    const sb = [...(b as number[])].sort();
    return sa.every((v, i) => deepEqual(v, sb[i]));
  }
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-5;
  return JSON.stringify(a) === JSON.stringify(b);
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: ts-node src/run-answer.ts <path-to-answer.ts>");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const code = fs.readFileSync(file, "utf-8");
  const base = path.basename(file);
  console.log(`\nRunning answer: ${file}\n${"─".repeat(60)}`);

  // ── Scheduler answer ────────────────────────────────────────────────────────
  if (/scheduler/i.test(base)) {
    const exports = evalCode(code);
    const ServiceClass = exports["ReminderService"] as any;
    if (typeof ServiceClass !== "function") {
      console.error("ReminderService class not exported by this file.");
      process.exit(1);
    }
    const { passed, total } = runSchedulerTests(ServiceClass);
    console.log(`Scheduler ReminderService: ${passed}/${total} behavioural checks passed`);
    process.exit(passed === total ? 0 : 1);
  }

  // ── LeetCode answer ───────────────────────────────────────────────────────────
  const m = base.match(/^LC(\d+)-/);
  if (!m) {
    console.error("Cannot infer problem from filename. Expected LC<id>-<slug>.ts");
    process.exit(1);
  }
  const id = parseInt(m[1], 10);
  const problem = PROBLEMS.find((p) => p.id === id);
  if (!problem) {
    console.error(`No problem with id ${id} in the problem bank.`);
    process.exit(1);
  }

  console.log(`Problem: LC#${problem.id} ${problem.title} (${problem.difficulty})\n`);

  const exports = evalCode(code);
  let fn = exports[problem.functionName] as ((...a: unknown[]) => unknown) | undefined;
  if (typeof fn !== "function") {
    fn = Object.values(exports).find((v) => typeof v === "function") as any;
  }
  if (typeof fn !== "function") {
    console.error(`Function '${problem.functionName}' not exported.`);
    process.exit(1);
  }

  let passed = 0;
  problem.testCases.forEach((tc, i) => {
    try {
      const actual = (fn as any)(...tc.input);
      const ok = deepEqual(actual, tc.expected);
      if (ok) passed++;
      console.log(
        `  [${ok ? "PASS" : "FAIL"}] case ${i + 1}: input=${JSON.stringify(tc.input)} ` +
          `expected=${JSON.stringify(tc.expected)} got=${JSON.stringify(actual)}`
      );
    } catch (e) {
      console.log(`  [FAIL] case ${i + 1}: threw ${(e as Error).message}`);
    }
  });

  console.log(`\nResult: ${passed}/${problem.testCases.length} test cases passed`);
  process.exit(passed === problem.testCases.length ? 0 : 1);
}

main();
