import { ModelClient, CompletionRequest } from "../clients/types";
import { extractCode, evalCode } from "../utils/extract-code";
import { log } from "../utils/logger";
import { LeetCodeProblem, TestCase } from "./problems";

export interface TestResult {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  actual: unknown;
  error?: string;
}

export interface ProblemResult {
  problem: LeetCodeProblem;
  model: string;
  passed: number;
  total: number;
  passRate: number;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  generatedCode: string;
  testResults: TestResult[];
  error?: string;
}

const SYSTEM_PROMPT = `You are an expert TypeScript engineer. When asked to solve a coding problem:
1. Write clean, correct TypeScript code.
2. Wrap your solution in a single \`\`\`typescript code block.
3. Use module.exports = { functionName } at the end.
4. Do NOT include any explanation outside the code block.
5. Ensure your solution handles all edge cases.`;

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Sort for order-independent comparison (e.g. twoSum)
    const sa = [...(a as number[])].sort();
    const sb = [...(b as number[])].sort();
    return sa.every((v, i) => deepEqual(v, sb[i]));
  }
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-5; // float tolerance for median
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function runTestCase(
  fn: (...args: unknown[]) => unknown,
  tc: TestCase
): TestResult {
  try {
    const actual = fn(...tc.input);
    const passed = deepEqual(actual, tc.expected);
    return { passed, input: tc.input, expected: tc.expected, actual };
  } catch (e: unknown) {
    return {
      passed: false,
      input: tc.input,
      expected: tc.expected,
      actual: undefined,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function evaluateProblem(
  client: ModelClient,
  problem: LeetCodeProblem
): Promise<ProblemResult> {
  log.dim(`  → ${problem.title} (${problem.difficulty})`);

  const req: CompletionRequest = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: problem.prompt },
    ],
    temperature: 0.05,
    maxTokens: 2048,
  };

  let generatedCode = "";
  let latencyMs = 0;
  let tokens = 0;
  let costUsd = 0;

  try {
    const res = await client.complete(req);
    generatedCode = extractCode(res.content);
    latencyMs = res.latencyMs;
    tokens = res.totalTokens;
    costUsd = res.costUsd ?? 0;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`    LLM call failed: ${msg}`);
    return {
      problem,
      model: client.modelId,
      passed: 0,
      total: problem.testCases.length,
      passRate: 0,
      latencyMs: 0,
      tokens: 0,
      costUsd: 0,
      generatedCode: "",
      testResults: [],
      error: msg,
    };
  }

  // Eval and run test cases
  let exports: Record<string, unknown> = {};
  try {
    exports = evalCode(generatedCode);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`    Code eval failed: ${msg}`);
    return {
      problem,
      model: client.modelId,
      passed: 0,
      total: problem.testCases.length,
      passRate: 0,
      latencyMs,
      tokens,
      costUsd,
      generatedCode,
      testResults: [],
      error: `Code eval error: ${msg}`,
    };
  }

  const fn = exports[problem.functionName] as ((...args: unknown[]) => unknown) | undefined;
  if (typeof fn !== "function") {
    // Try to find any exported function
    const anyFn = Object.values(exports).find((v) => typeof v === "function") as
      | ((...args: unknown[]) => unknown)
      | undefined;
    if (!anyFn) {
      return {
        problem,
        model: client.modelId,
        passed: 0,
        total: problem.testCases.length,
        passRate: 0,
        latencyMs,
        tokens,
        costUsd,
        generatedCode,
        testResults: [],
        error: `Function '${problem.functionName}' not exported`,
      };
    }
    // Use whatever was exported
    exports[problem.functionName] = anyFn;
  }

  const theFn = exports[problem.functionName] as (...args: unknown[]) => unknown;
  const testResults = problem.testCases.map((tc) => runTestCase(theFn, tc));
  const passed = testResults.filter((r) => r.passed).length;

  return {
    problem,
    model: client.modelId,
    passed,
    total: problem.testCases.length,
    passRate: passed / problem.testCases.length,
    latencyMs,
    tokens,
    costUsd,
    generatedCode,
    testResults,
  };
}
