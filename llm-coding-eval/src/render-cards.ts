/**
 * Renders a results JSON file into a human-readable ASCII text card.
 *
 *   npx ts-node src/render-cards.ts <results.json> <output.txt>
 *
 * Reused for both the 7B and 32B runs.
 */
import * as fs from "fs";

const W = 78; // card width

function line(ch = "─"): string {
  return "+" + ch.repeat(W - 2) + "+";
}

function row(left: string, right = ""): string {
  const pad = W - 4 - left.length - right.length;
  return "| " + left + " ".repeat(Math.max(1, pad)) + right + " |";
}

function center(text: string): string {
  const pad = W - 2 - text.length;
  const l = Math.floor(pad / 2);
  return "|" + " ".repeat(Math.max(0, l)) + text + " ".repeat(Math.max(0, pad - l)) + "|";
}

function bar(passed: number, total: number, width = 20): string {
  if (total === 0) return " ".repeat(width);
  const filled = Math.round((passed / total) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function renderModel(m: any): string {
  const out: string[] = [];
  const s = m.summary;

  out.push(line("═"));
  out.push(center(m.label));
  out.push(center(m.modelId + "  ·  local · Ollama"));
  out.push(line("═"));
  out.push(row(""));

  // Summary metrics
  const lcPct = ((s.lcRate) * 100).toFixed(0);
  out.push(row("  LeetCode pass rate", `${s.lcPassed}/${s.lcTotal}  (${lcPct}%)`));
  out.push(row(`     ${bar(s.lcPassed, s.lcTotal)}`));
  out.push(row("  Scheduler app (25 behavioural tests)", `${s.schedPassed}/${s.schedTotal}`));
  out.push(row(`     ${bar(s.schedPassed, s.schedTotal)}`));
  out.push(row("  Avg latency / problem", `${s.avgLatencyMs} ms`));
  const avgTok = Math.round(
    m.leetcode.reduce((a: number, r: any) => a + r.tokens, 0) / m.leetcode.length
  );
  out.push(row("  Avg tokens / problem", `${avgTok}`));
  out.push(row(""));
  out.push(line());

  // LeetCode detail
  out.push(row("  LEETCODE — by problem"));
  out.push(row(""));
  for (const r of m.leetcode) {
    const status = r.passed === r.total ? "PASS" : r.passed === 0 ? "FAIL" : "PART";
    const diff = r.difficulty.padEnd(6);
    const title = (`LC#${r.id} ${r.title}`).slice(0, 40).padEnd(40);
    out.push(row(`  [${status}] ${diff} ${title}`, `${r.passed}/${r.total}  ${r.latencyMs}ms`));
    if (r.error) {
      out.push(row(`         ↳ ${r.error.slice(0, 56)}`));
    }
  }
  out.push(row(""));
  out.push(line());

  // Scheduler detail
  out.push(row("  SCHEDULER APP — ReminderService generation"));
  out.push(row(""));
  out.push(row("  Class generated", m.scheduler.generated ? "yes" : "no"));
  out.push(row("  Class exported correctly", m.scheduler.classFound ? "yes" : "no"));
  out.push(row("  Tests passed", `${m.scheduler.passed}/${m.scheduler.total}`));
  out.push(row("  Generation latency", `${m.scheduler.latencyMs} ms`));
  out.push(row("  Generation tokens", `${m.scheduler.tokens}`));
  if (m.scheduler.error) {
    out.push(row(`  Error: ${m.scheduler.error.slice(0, 56)}`));
  }
  out.push(row(""));
  out.push(line("═"));

  return out.join("\n");
}

function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    console.error("Usage: ts-node src/render-cards.ts <results.json> <output.txt>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inPath, "utf-8"));
  const parts: string[] = [];

  parts.push("");
  parts.push("  LLM CODING EVAL — RESULTS");
  parts.push(`  Generated: ${data.generatedAt}`);
  parts.push("  Suite: 10 LeetCode problems (Easy→Hard) + 25-test Scheduler app");
  parts.push("  Runtime: local via Ollama, TypeScript output, sandboxed execution");
  parts.push("");

  for (const m of data.models) {
    parts.push(renderModel(m));
    parts.push("");
    parts.push("");
  }

  // Retrieve-the-answer guide, derived from the saved answerFile paths.
  const sample = data.models[0]?.leetcode?.find((r: any) => r.answerFile);
  if (sample) {
    const dir = sample.answerFile.replace(/[\\/][^\\/]+$/, "");
    const root = dir.replace(/[\\/][^\\/]+$/, "");
    parts.push("  MODEL ANSWER FILES");
    parts.push(`  Every generated solution is saved as a .ts file under: ${root}/<model>/`);
    parts.push("  Retrieve one (open in your editor or print it):");
    parts.push(`     type ${sample.answerFile.replace(/\//g, "\\")}`);
    parts.push("  Re-run a saved answer against its test cases:");
    parts.push(`     npx ts-node src/run-answer.ts ${sample.answerFile.replace(/\\/g, "/")}`);
    parts.push("  Re-run a saved scheduler class through the 26-check harness:");
    parts.push(`     npx ts-node src/run-answer.ts ${root}/<model>/scheduler-ReminderService.ts`);
    parts.push("");
  }

  parts.push("  NOTES");
  parts.push("  • Median (LC#295) uses a class-based driver the runner does not");
  parts.push("    fully exercise — a 0/1 there reflects a harness limit, not the model.");
  parts.push("  • Pass thresholds are exact test-case matches with float tolerance 1e-5.");
  parts.push("  • Generated code runs in a worker thread, killed at 5s (infinite-loop guard).");
  parts.push("");

  fs.writeFileSync(outPath, parts.join("\n"), "utf-8");
  console.log(`Wrote ${outPath}`);
}

main();
