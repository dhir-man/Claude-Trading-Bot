#!/usr/bin/env ts-node
/**
 * eval-runner.ts  —  Interactive LLM Coding Eval Harness
 *
 * Runs each LeetCode problem ONE AT A TIME against a selected driver/model.
 * Writes per-problem output files and a consolidated JSON summary.
 *
 * Usage:
 *   npx ts-node src/eval-runner.ts [--driver <key>] [--problem <slug>] [--all]
 *
 * Drivers:
 *   claude         AnthropicClient  (ANTHROPIC_API_KEY required)
 *   openai         OpenAIClient     (OPENAI_API_KEY required)
 *   ollama-qwen7b  OllamaClient     (Ollama running locally)
 *   ollama-qwen14b OllamaClient     (Ollama running locally, 14b model)
 *   ollama-deepseek OllamaClient    (Ollama running locally, deepseek-coder)
 *   litellm        LiteLLMClient    (LiteLLM proxy at localhost:4000)
 *   langchain-anthropic  LangChainClient/anthropic
 *   langchain-openai     LangChainClient/openai
 *   langchain-ollama     LangChainClient/ollama
 *
 * Outputs written to:  ./eval-outputs/<driver>/<slug>/
 *   prompt.txt        — the exact prompt sent to the model
 *   response.txt      — raw LLM response
 *   extracted-code.ts — code extracted from response
 *   test-results.json — per-test-case pass/fail detail
 *   summary.json      — latency, tokens, passRate etc.
 *
 * Consolidated run report: ./eval-outputs/<driver>/run-<timestamp>.json
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import dotenv from "dotenv";
dotenv.config();

import { PROBLEMS, LeetCodeProblem } from "./leetcode/problems";
import { evaluateProblem, ProblemResult } from "./leetcode/runner";
import { ModelClient } from "./clients/types";
import { AnthropicClient } from "./clients/anthropic-client";
import { OpenAIClient } from "./clients/openai-client";
import { OllamaClient } from "./clients/ollama-client";
import { LiteLLMClient } from "./clients/litellm-client";
import { LangChainClient } from "./clients/langchain-client";
import { DeepSeekClient } from "./clients/deepseek-client";
import { GLMClient } from "./clients/glm-client";

// ─── Driver registry ──────────────────────────────────────────────────────────

export type DriverKey =
  | "claude"
  | "openai"
  | "deepseek"
  | "glm"
  | "ollama-qwen7b"
  | "ollama-qwen14b"
  | "ollama-deepseek"
  | "litellm"
  | "langchain-anthropic"
  | "langchain-openai"
  | "langchain-ollama";

function buildDriver(key: DriverKey): ModelClient {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  switch (key) {
    case "claude":
      if (!process.env.ANTHROPIC_API_KEY)
        throw new Error("ANTHROPIC_API_KEY not set in .env");
      return new AnthropicClient(
        process.env.ANTHROPIC_API_KEY,
        process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6"
      );

    case "openai":
      if (!process.env.OPENAI_API_KEY)
        throw new Error("OPENAI_API_KEY not set in .env");
      return new OpenAIClient(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL ?? "gpt-4o",
        process.env.OPENAI_API_BASE_URL
      );

    case "deepseek":
      if (!process.env.DEEPSEEK_API_KEY)
        throw new Error("DEEPSEEK_API_KEY not set in .env");
      return new DeepSeekClient(
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_MODEL ?? "deepseek-coder",
        process.env.DEEPSEEK_API_BASE_URL
      );

    case "glm":
      if (!process.env.GLM_API_KEY)
        throw new Error("GLM_API_KEY not set in .env");
      return new GLMClient(
        process.env.GLM_API_KEY,
        process.env.GLM_MODEL ?? "glm-4-flash",
        process.env.GLM_API_BASE_URL
      );

    case "ollama-qwen7b":
      return new OllamaClient(
        process.env.QWEN_MODEL ?? "qwen2.5-coder:7b-instruct-q4_K_M",
        ollamaUrl
      );

    case "ollama-qwen14b":
      return new OllamaClient(
        process.env.QWEN14B_MODEL ?? "qwen2.5-coder:14b-instruct-q4_K_M",
        ollamaUrl
      );

    case "ollama-deepseek":
      return new OllamaClient(
        process.env.DEEPSEEK_LOCAL_MODEL ?? "deepseek-coder:6.7b-instruct-q4_K_M",
        ollamaUrl
      );

    case "litellm":
      return new LiteLLMClient(
        process.env.LITELLM_MODEL ?? "anthropic/claude-sonnet-4-6",
        process.env.LITELLM_BASE_URL ?? "http://localhost:4000/v1",
        process.env.LITELLM_API_KEY ?? "sk-litellm-proxy"
      );

    case "langchain-anthropic":
      if (!process.env.ANTHROPIC_API_KEY)
        throw new Error("ANTHROPIC_API_KEY not set in .env");
      return new LangChainClient("anthropic");

    case "langchain-openai":
      if (!process.env.OPENAI_API_KEY)
        throw new Error("OPENAI_API_KEY not set in .env");
      return new LangChainClient("openai");

    case "langchain-ollama":
      return new LangChainClient("ollama");

    default:
      throw new Error(`Unknown driver key: ${key}`);
  }
}

// ─── Output helpers ───────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeOutput(
  baseDir: string,
  problem: LeetCodeProblem,
  result: ProblemResult & { rawResponse?: string }
): void {
  const dir = path.join(baseDir, problem.slug);
  ensureDir(dir);

  // 1. Prompt sent
  fs.writeFileSync(path.join(dir, "prompt.txt"), problem.prompt, "utf8");

  // 2. Raw LLM response
  fs.writeFileSync(
    path.join(dir, "response.txt"),
    result.rawResponse ?? result.generatedCode ?? "",
    "utf8"
  );

  // 3. Extracted code
  fs.writeFileSync(
    path.join(dir, "extracted-code.ts"),
    result.generatedCode ?? "",
    "utf8"
  );

  // 4. Per-test-case results
  fs.writeFileSync(
    path.join(dir, "test-results.json"),
    JSON.stringify(result.testResults ?? [], null, 2),
    "utf8"
  );

  // 5. Summary
  const summary = {
    problemId: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    category: problem.category,
    model: result.model,
    passed: result.passed,
    total: result.total,
    passRate: result.passRate,
    latencyMs: result.latencyMs,
    tokens: result.tokens,
    costUsd: result.costUsd ?? 0,
    error: result.error ?? null,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(dir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
}

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printProblemResult(pr: ProblemResult, index: number, total: number): void {
  const statusIcon = pr.passed === pr.total ? `${C.green}✓` : `${C.red}✗`;
  const bar = pr.passed === pr.total ? C.green : pr.passed > 0 ? C.yellow : C.red;
  const diffColor =
    pr.problem.difficulty === "Easy"
      ? C.green
      : pr.problem.difficulty === "Medium"
      ? C.yellow
      : C.red;

  console.log(
    `\n${C.bold}[${index}/${total}] ${pr.problem.title}${C.reset}  ` +
      `${diffColor}${pr.problem.difficulty}${C.reset}  ${C.dim}${pr.problem.category}${C.reset}`
  );
  console.log(
    `  ${statusIcon} ${bar}${pr.passed}/${pr.total} tests passed${C.reset}` +
      `  ${C.dim}${pr.latencyMs}ms  ${pr.tokens} tokens${C.reset}`
  );

  if (pr.error) {
    console.log(`  ${C.red}⚠ Error: ${pr.error}${C.reset}`);
  }

  if (pr.testResults && pr.testResults.length > 0) {
    for (const tr of pr.testResults) {
      const icon = tr.passed ? `${C.green}  ✓` : `${C.red}  ✗`;
      const inp = JSON.stringify(tr.input).slice(0, 60);
      const exp = JSON.stringify(tr.expected);
      const got = JSON.stringify(tr.actual);
      if (!tr.passed) {
        console.log(
          `${icon} input=${inp}  expected=${exp}  got=${got}${C.reset}`
        );
      } else {
        console.log(`${icon} ${C.dim}${inp}${C.reset}`);
      }
    }
  }
}

// ─── Single-problem interactive prompt ───────────────────────────────────────

async function promptContinue(rl: readline.Interface): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(
      `\n${C.cyan}Press ENTER to run next problem, or type 'q' to quit: ${C.reset}`,
      (ans) => resolve(ans.trim().toLowerCase() !== "q")
    );
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const hasFlag = (flag: string): boolean => args.includes(flag);

  const driverKey = (getArg("--driver") ?? process.env.DRIVER ?? "claude") as DriverKey;
  const problemSlug = getArg("--problem");
  const runAll = hasFlag("--all");
  const noInteractive = hasFlag("--no-interactive") || runAll;

  // ── Build client ──────────────────────────────────────────────────────────
  console.log(
    `\n${C.bold}${C.cyan}LLM Coding Eval — Driver: ${driverKey}${C.reset}\n`
  );

  let client: ModelClient;
  try {
    client = buildDriver(driverKey);
  } catch (e) {
    console.error(`${C.red}Failed to build driver:${C.reset}`, (e as Error).message);
    process.exit(1);
  }

  console.log(`${C.dim}Model: ${client.modelId}  (${client.name})${C.reset}`);

  const available = await client.isAvailable().catch(() => false);
  if (!available) {
    console.warn(
      `${C.yellow}⚠ isAvailable() returned false — proceeding anyway ` +
        `(some drivers always report false until the first call)${C.reset}`
    );
  }

  // ── Select problems ───────────────────────────────────────────────────────
  const problems: LeetCodeProblem[] = problemSlug
    ? PROBLEMS.filter((p) => p.slug === problemSlug)
    : PROBLEMS;

  if (problems.length === 0) {
    console.error(`No problems matched slug="${problemSlug}".`);
    process.exit(1);
  }

  // ── Output directory ──────────────────────────────────────────────────────
  const outDir = path.join(
    process.cwd(),
    "eval-outputs",
    slugify(driverKey)
  );
  ensureDir(outDir);
  console.log(`\nOutputs → ${C.cyan}${outDir}/${C.reset}\n`);

  // ── Print problem list ────────────────────────────────────────────────────
  console.log(`${C.bold}Problems to evaluate (${problems.length}):${C.reset}`);
  for (const p of problems) {
    const dc =
      p.difficulty === "Easy" ? C.green : p.difficulty === "Medium" ? C.yellow : C.red;
    console.log(`  ${dc}${pad(p.difficulty, 8)}${C.reset}  #${p.id}  ${p.title}`);
  }

  // ── Run loop ──────────────────────────────────────────────────────────────
  const rl = noInteractive
    ? null
    : readline.createInterface({ input: process.stdin, output: process.stdout });

  const allResults: ProblemResult[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];

    if (!noInteractive && rl && i > 0) {
      const cont = await promptContinue(rl);
      if (!cont) {
        console.log(`\n${C.yellow}Stopping at user request.${C.reset}`);
        break;
      }
    }

    console.log(
      `\n${C.bold}${C.cyan}─── Running [${i + 1}/${problems.length}]: ${problem.title} ───${C.reset}`
    );

    const result = await evaluateProblem(client, problem);
    allResults.push(result);
    writeOutput(outDir, problem, result);
    printProblemResult(result, i + 1, problems.length);

    console.log(
      `  ${C.dim}Outputs written to ${outDir}/${problem.slug}/${C.reset}`
    );
  }

  rl?.close();

  // ── Consolidated run report ───────────────────────────────────────────────
  const totalPassed = allResults.reduce((s, r) => s + r.passed, 0);
  const totalTests = allResults.reduce((s, r) => s + r.total, 0);
  const totalLatency = allResults.reduce((s, r) => s + r.latencyMs, 0);
  const totalTokens = allResults.reduce((s, r) => s + r.tokens, 0);

  const runReport = {
    driver: driverKey,
    model: client.modelId,
    timestamp,
    summary: {
      problems: allResults.length,
      totalTests,
      totalPassed,
      overallPassRate: totalTests > 0 ? totalPassed / totalTests : 0,
      totalLatencyMs: totalLatency,
      avgLatencyMs: allResults.length > 0 ? Math.round(totalLatency / allResults.length) : 0,
      totalTokens,
    },
    results: allResults.map((r) => ({
      problemId: r.problem.id,
      slug: r.problem.slug,
      title: r.problem.title,
      difficulty: r.problem.difficulty,
      passed: r.passed,
      total: r.total,
      passRate: r.passRate,
      latencyMs: r.latencyMs,
      tokens: r.tokens,
      error: r.error ?? null,
    })),
  };

  const reportPath = path.join(outDir, `run-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(runReport, null, 2), "utf8");

  // ── Final table ───────────────────────────────────────────────────────────
  console.log(`\n\n${C.bold}${"─".repeat(70)}`);
  console.log(`Run complete: ${driverKey} / ${client.modelId}`);
  console.log("─".repeat(70) + C.reset);
  console.log(
    `${pad("Problem", 42)} ${pad("Diff", 8)} ${pad("Tests", 8)} ${pad("ms", 8)} Tokens`
  );
  console.log("─".repeat(70));

  for (const r of allResults) {
    const ok = r.passed === r.total;
    const dc =
      r.problem.difficulty === "Easy"
        ? C.green
        : r.problem.difficulty === "Medium"
        ? C.yellow
        : C.red;
    const sc = ok ? C.green : r.passed > 0 ? C.yellow : C.red;
    console.log(
      `${pad(r.problem.title, 42)} ${dc}${pad(r.problem.difficulty, 8)}${C.reset} ` +
        `${sc}${pad(`${r.passed}/${r.total}`, 8)}${C.reset} ` +
        `${pad(String(r.latencyMs), 8)} ${r.tokens}`
    );
  }

  console.log("─".repeat(70));
  const pct = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0.0";
  const overallColor = parseFloat(pct) >= 80 ? C.green : parseFloat(pct) >= 50 ? C.yellow : C.red;
  console.log(
    `${C.bold}Overall pass rate: ${overallColor}${pct}%${C.reset}${C.bold} ` +
      `(${totalPassed}/${totalTests})   avg latency: ${Math.round(totalLatency / Math.max(allResults.length, 1))}ms   ` +
      `total tokens: ${totalTokens}${C.reset}`
  );
  console.log(`\n${C.cyan}Run report: ${reportPath}${C.reset}\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
