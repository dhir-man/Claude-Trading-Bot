import * as path from "path";
import { Worker } from "worker_threads";
import { ModelClient, CompletionRequest } from "../clients/types";
import { extractCode } from "../utils/extract-code";
import { log } from "../utils/logger";
import { writeOutput } from "../utils/output-writer";
import { LeetCodeProblem, TestCase } from "./problems";

const EXEC_TIMEOUT_MS = 5000;

interface WorkerOutcome {
  results?: TestResult[];
  fatal?: string;
  timedOut?: boolean;
}

function runInWorker(
  code: string,
  functionName: string,
  testCases: TestCase[]
): Promise<WorkerOutcome> {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, "eval-worker.js");
    let settled = false;

    const worker = new Worker(workerPath, {
      workerData: { code, functionName, testCases },
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve({ timedOut: true });
    }, EXEC_TIMEOUT_MS);

    worker.on("message", (msg: WorkerOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(msg);
    });

    worker.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ fatal: err.message });
    });

    worker.on("exit", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ fatal: "Worker exited without result" });
    });
  });
}

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
  rawResponse: string;
  testResults: TestResult[];
  error?: string;
}

const SYSTEM_PROMPT = `You are an expert TypeScript engineer. When asked to solve a coding problem:
1. Write clean, correct TypeScript code.
2. Wrap your solution in a single \`\`\`typescript code block.
3. Use module.exports = { functionName } at the end.
4. Do NOT include any explanation outside the code block.
5. Ensure your solution handles all edge cases.`;

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

  let rawResponse = "";
  let generatedCode = "";
  let latencyMs = 0;
  let tokens = 0;
  let costUsd = 0;

  try {
    const res = await client.complete(req);
    rawResponse = res.content;
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
      rawResponse: "",
      testResults: [],
      error: msg,
    };
  }

  const outcome = await runInWorker(generatedCode, problem.functionName, problem.testCases);

  const base = {
    problem,
    model: client.modelId,
    latencyMs,
    tokens,
    costUsd,
    generatedCode,
    rawResponse,
  };

  let result: ProblemResult;

  if (outcome.timedOut) {
    log.warn(`    Execution timed out (>${EXEC_TIMEOUT_MS}ms)`);
    result = {
      ...base,
      passed: 0,
      total: problem.testCases.length,
      passRate: 0,
      testResults: [],
      error: `Execution timeout (>${EXEC_TIMEOUT_MS}ms)`,
    };
  } else if (outcome.fatal || !outcome.results) {
    log.error(`    ${outcome.fatal ?? "No results from worker"}`);
    result = {
      ...base,
      passed: 0,
      total: problem.testCases.length,
      passRate: 0,
      testResults: [],
      error: outcome.fatal ?? "No results from worker",
    };
  } else {
    const testResults = outcome.results;
    const passed = testResults.filter((r) => r.passed).length;
    result = {
      ...base,
      passed,
      total: problem.testCases.length,
      passRate: passed / problem.testCases.length,
      testResults,
    };
  }

  // Write output files for this problem
  writeOutput({
    model: client.modelId,
    suite: "leetcode",
    slug: problem.slug,
    rawResponse,
    extractedCode: generatedCode,
    latencyMs,
    tokens,
    costUsd,
    passed: result.passed,
    total: result.total,
    testResults: result.testResults,
    error: result.error,
    timestamp: new Date().toISOString(),
  });

  return result;
}
