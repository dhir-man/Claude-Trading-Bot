/**
 * Run evaluation across all available models and print a comparison table.
 * node dist/run-all.js
 */
import dotenv from "dotenv";
dotenv.config();

import { buildClient, MODEL_PRICING, ModelKey } from "./clients";
import { PROBLEMS } from "./leetcode/problems";
import { evaluateProblem, ProblemResult } from "./leetcode/runner";
import { log } from "./utils/logger";

const MODELS: ModelKey[] = ["qwen32b", "deepseek", "glm"];

async function main() {
  log.section("LLM Coding Eval — All Models");

  const summary: {
    model: string;
    passRate: string;
    avgLatency: string;
    totalCost: string;
    totalTokens: number;
  }[] = [];

  for (const key of MODELS) {
    let client;
    try {
      client = buildClient(key);
    } catch (e: unknown) {
      log.warn(`Skipping ${key}: ${(e as Error).message}`);
      continue;
    }

    const available = await client.isAvailable();
    if (!available) {
      log.warn(`${client.modelId} not available — skipping`);
      continue;
    }

    log.section(`Model: ${client.name}`);

    const results: ProblemResult[] = [];
    for (const problem of PROBLEMS) {
      const r = await evaluateProblem(client, problem);
      results.push(r);
      const icon = r.passRate === 1 ? "✓" : r.passRate === 0 ? "✗" : "~";
      log.info(
        `  ${icon} ${problem.title.padEnd(48)} ${r.passed}/${r.total} (${r.latencyMs}ms)`
      );
    }

    const totalPassed = results.reduce((s, r) => s + r.passed, 0);
    const totalTests = results.reduce((s, r) => s + r.total, 0);
    const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
    const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
    const totalTokens = results.reduce((s, r) => s + r.tokens, 0);

    summary.push({
      model: client.name,
      passRate: `${totalPassed}/${totalTests} (${((totalPassed / totalTests) * 100).toFixed(0)}%)`,
      avgLatency: `${avgLatency.toFixed(0)}ms`,
      totalCost: `$${totalCost.toFixed(5)}`,
      totalTokens,
    });
  }

  log.section("Comparison Summary");
  console.table(summary);
}

main().catch((e) => {
  log.error(String(e));
  process.exit(1);
});
