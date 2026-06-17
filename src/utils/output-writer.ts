/**
 * Saves every LLM response to a structured output directory so results can
 * be opened, inspected, and re-run manually without re-hitting the API.
 *
 * Directory layout:
 *   outputs/
 *     <model>/
 *       <suite>/
 *         <slug>/
 *           response.txt   — raw LLM markdown response
 *           code.ts        — extracted TypeScript code block
 *           results.json   — structured test results + metrics
 */
import * as fs from "fs";
import * as path from "path";

export interface OutputRecord {
  model: string;
  suite: string;
  slug: string;
  rawResponse: string;
  extractedCode: string;
  latencyMs: number;
  tokens: number;
  costUsd: number;
  passed: number;
  total: number;
  testResults?: unknown[];
  error?: string;
  timestamp: string;
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_\-\.]/g, "_").slice(0, 64);
}

export function writeOutput(record: OutputRecord): string {
  const base = process.env.OUTPUT_DIR ?? "./outputs";
  const dir = path.join(
    base,
    sanitize(record.model),
    sanitize(record.suite),
    sanitize(record.slug)
  );
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "response.txt"), record.rawResponse, "utf8");
  fs.writeFileSync(path.join(dir, "code.ts"), record.extractedCode, "utf8");
  fs.writeFileSync(
    path.join(dir, "results.json"),
    JSON.stringify(
      {
        model: record.model,
        suite: record.suite,
        slug: record.slug,
        timestamp: record.timestamp,
        latencyMs: record.latencyMs,
        tokens: record.tokens,
        costUsd: record.costUsd,
        passed: record.passed,
        total: record.total,
        passRate: record.total > 0 ? record.passed / record.total : 0,
        error: record.error ?? null,
        testResults: record.testResults ?? [],
      },
      null,
      2
    ),
    "utf8"
  );

  return dir;
}

export function writeSuiteSummary(
  model: string,
  suite: string,
  records: OutputRecord[]
): void {
  const base = process.env.OUTPUT_DIR ?? "./outputs";
  const dir = path.join(base, sanitize(model), sanitize(suite));
  fs.mkdirSync(dir, { recursive: true });

  const summary = {
    model,
    suite,
    timestamp: new Date().toISOString(),
    totalPassed: records.reduce((s, r) => s + r.passed, 0),
    totalTests: records.reduce((s, r) => s + r.total, 0),
    avgLatencyMs: records.length
      ? records.reduce((s, r) => s + r.latencyMs, 0) / records.length
      : 0,
    totalTokens: records.reduce((s, r) => s + r.tokens, 0),
    totalCostUsd: records.reduce((s, r) => s + r.costUsd, 0),
    problems: records.map((r) => ({
      slug: r.slug,
      passed: r.passed,
      total: r.total,
      latencyMs: r.latencyMs,
      tokens: r.tokens,
    })),
  };

  fs.writeFileSync(
    path.join(dir, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
}
