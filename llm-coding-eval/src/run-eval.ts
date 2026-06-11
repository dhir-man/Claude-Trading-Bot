/**
 * Clean evaluation runner — runs LeetCode + Scheduler suites for the
 * local 7B models and writes structured JSON + a formatted summary.
 *
 *   npx ts-node src/run-eval.ts
 *
 * Output: results.json  (machine-readable, used to render result cards)
 */
import dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import { buildClient, ModelKey } from "./clients";
import { CompletionRequest } from "./clients/types";
import { PROBLEMS } from "./leetcode/problems";
import { evaluateProblem } from "./leetcode/runner";
import { extractCode, evalCode } from "./utils/extract-code";
import * as path from "path";
import { SCHEDULER_APP_PROMPT } from "./scheduler/prompt";

interface SchedulerResult {
  generated: boolean;
  classFound: boolean;
  passed: number;
  total: number;
  latencyMs: number;
  tokens: number;
  error?: string;
  code?: string;
}

// Directory where each model's generated solutions are saved.
// Derived from the output filename: results-7b.json -> answers-7b/
const ANSWERS_DIR =
  process.env.ANSWERS_DIR ??
  (process.env.OUT ?? "results.json").replace(/^results-?/, "answers-").replace(/\.json$/, "").replace(/^answers-$/, "answers");

// Labels can be overridden via env (e.g. for the 32B run) so the same
// runner produces correctly-labelled output without code edits.
const MODELS: { key: ModelKey; label: string }[] = [
  { key: "qwen7b", label: process.env.QWEN_LABEL ?? "Qwen2.5-Coder 7B" },
  { key: "deepseek", label: process.env.DEEPSEEK_LABEL ?? "DeepSeek-Coder 6.7B" },
];

const OUT_FILE = process.env.OUT ?? "results.json";

// Minimal scheduler harness (mirrors tests/scheduler.test.ts assertions)
function runSchedulerTests(ServiceClass: any): { passed: number; total: number } {
  const now = Date.now();
  const FUTURE = (m: number) => new Date(now + m * 60000);
  const PAST = (m: number) => new Date(now - m * 60000);
  const checks: (() => boolean)[] = [];
  const svc = () => new ServiceClass();

  // create
  checks.push(() => { const r = svc().create({ title: "A", dueAt: FUTURE(30) }); return !!r.id && r.completed === false && r.repeat === "once"; });
  checks.push(() => { const r = svc().create({ title: "B", dueAt: FUTURE(30), repeat: "weekly", tags: ["x"] }); return r.repeat === "weekly" && r.tags.includes("x"); });
  checks.push(() => { const s = svc(); const a = s.create({ title: "A", dueAt: FUTURE(10) }); const b = s.create({ title: "B", dueAt: FUTURE(20) }); return a.id !== b.id; });
  checks.push(() => { const r = svc().create({ title: "X", dueAt: FUTURE(5) }); return r.repeat === "once"; });
  // getById
  checks.push(() => { const s = svc(); const r = s.create({ title: "F", dueAt: FUTURE(5) }); return s.getById(r.id)?.title === "F"; });
  checks.push(() => svc().getById("nope") === undefined);
  // listAll
  checks.push(() => svc().listAll().length === 0);
  checks.push(() => { const s = svc(); s.create({ title: "A", dueAt: FUTURE(10) }); s.create({ title: "B", dueAt: PAST(10) }); return s.listAll().length === 2; });
  // listPending
  checks.push(() => { const s = svc(); const f = s.create({ title: "F", dueAt: FUTURE(60) }); return s.listPending().some((r: any) => r.id === f.id); });
  checks.push(() => { const s = svc(); const r = s.create({ title: "D", dueAt: FUTURE(5) }); s.complete(r.id); return !s.listPending().some((x: any) => x.id === r.id); });
  // listOverdue
  checks.push(() => { const s = svc(); const p = s.create({ title: "O", dueAt: PAST(120) }); return s.listOverdue().some((r: any) => r.id === p.id); });
  checks.push(() => { const s = svc(); const f = s.create({ title: "N", dueAt: FUTURE(60) }); return !s.listOverdue().some((r: any) => r.id === f.id); });
  checks.push(() => { const s = svc(); const r = s.create({ title: "DL", dueAt: PAST(30) }); s.complete(r.id); return !s.listOverdue().some((x: any) => x.id === r.id); });
  // complete
  checks.push(() => { const s = svc(); const r = s.create({ title: "C", dueAt: FUTURE(60) }); return s.complete(r.id).completed === true; });
  checks.push(() => { try { svc().complete("ghost"); return false; } catch { return true; } });
  // delete
  checks.push(() => { const s = svc(); const r = s.create({ title: "D", dueAt: FUTURE(5) }); return s.delete(r.id) === true && s.getById(r.id) === undefined; });
  checks.push(() => svc().delete("nowhere") === false);
  // getDueWithin
  checks.push(() => { const s = svc(); const soon = s.create({ title: "S", dueAt: FUTURE(10) }); const later = s.create({ title: "L", dueAt: FUTURE(120) }); const d = s.getDueWithin(15); return d.some((r: any) => r.id === soon.id) && !d.some((r: any) => r.id === later.id); });
  checks.push(() => { const s = svc(); const p = s.create({ title: "P", dueAt: PAST(5) }); return !s.getDueWithin(30).some((r: any) => r.id === p.id); });
  // reschedule
  checks.push(() => { const s = svc(); const r = s.create({ title: "R", dueAt: FUTURE(5) }); const nd = FUTURE(200); return s.reschedule(r.id, nd).dueAt.getTime() === nd.getTime(); });
  checks.push(() => { try { svc().reschedule("ghost", FUTURE(60)); return false; } catch { return true; } });
  // integration (counts as 5)
  for (let i = 0; i < 5; i++) {
    checks.push(() => {
      const s = svc();
      const r1 = s.create({ title: "M", dueAt: FUTURE(30) });
      s.create({ title: "C", dueAt: FUTURE(5) });
      const r3 = s.create({ title: "Rent", dueAt: PAST(10) });
      s.create({ title: "Milk", dueAt: PAST(60) });
      if (s.listAll().length !== 4) return false;
      s.complete(r1.id);
      if (s.listPending().some((r: any) => r.id === r1.id)) return false;
      s.reschedule(r3.id, FUTURE(120));
      return !s.listOverdue().some((r: any) => r.id === r3.id);
    });
  }

  let passed = 0;
  for (const c of checks) { try { if (c()) passed++; } catch { /* fail */ } }
  return { passed, total: checks.length };
}

async function evalScheduler(key: ModelKey): Promise<SchedulerResult> {
  const client = buildClient(key);
  const req: CompletionRequest = {
    messages: [
      { role: "system", content: "You are an expert TypeScript engineer. Respond ONLY with a ```typescript code block." },
      { role: "user", content: SCHEDULER_APP_PROMPT },
    ],
    temperature: 0.05,
    maxTokens: 3000,
  };
  try {
    const res = await client.complete(req);
    const code = extractCode(res.content);
    const exports = evalCode(code);
    const ServiceClass = exports["ReminderService"] as any;
    if (typeof ServiceClass !== "function") {
      return { generated: true, classFound: false, passed: 0, total: 25, latencyMs: res.latencyMs, tokens: res.totalTokens, error: "ReminderService class not exported", code };
    }
    const { passed, total } = runSchedulerTests(ServiceClass);
    return { generated: true, classFound: true, passed, total, latencyMs: res.latencyMs, tokens: res.totalTokens, code };
  } catch (e) {
    return { generated: false, classFound: false, passed: 0, total: 25, latencyMs: 0, tokens: 0, error: (e as Error).message };
  }
}

/** Writes a generated solution to disk so it can be inspected and re-run. */
function saveAnswer(modelKey: string, filename: string, code: string): string {
  const dir = path.join(ANSWERS_DIR, modelKey);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, code, "utf-8");
  return filePath;
}

async function main() {
  const out: any = { generatedAt: new Date().toISOString(), models: [] };

  for (const { key, label } of MODELS) {
    console.log(`\n${"=".repeat(64)}\n  ${label}\n${"=".repeat(64)}`);
    const client = buildClient(key);
    const modelEntry: any = { key, label, modelId: client.modelId, leetcode: [], scheduler: null };

    // LeetCode
    console.log("\n  ── LeetCode (10 problems) ──");
    for (const p of PROBLEMS) {
      const r = await evaluateProblem(client, p);
      let answerFile: string | undefined;
      if (r.generatedCode) {
        answerFile = saveAnswer(key, `LC${p.id}-${p.slug}.ts`, r.generatedCode);
      }
      modelEntry.leetcode.push({
        id: p.id, title: p.title, difficulty: p.difficulty, slug: p.slug,
        passed: r.passed, total: r.total, latencyMs: r.latencyMs, tokens: r.tokens,
        error: r.error, answerFile,
      });
      const icon = r.passRate === 1 ? "PASS" : r.passRate === 0 ? "FAIL" : "PART";
      console.log(`  [${icon}] LC#${String(p.id).padEnd(4)} ${p.title.padEnd(46)} ${r.passed}/${r.total}  ${r.latencyMs}ms`);
    }

    // Scheduler
    console.log("\n  ── Scheduler App (25 tests) ──");
    const sched = await evalScheduler(key);
    let schedAnswerFile: string | undefined;
    if (sched.code) {
      schedAnswerFile = saveAnswer(key, "scheduler-ReminderService.ts", sched.code);
    }
    modelEntry.scheduler = { ...sched, code: undefined, answerFile: schedAnswerFile };
    console.log(`  ReminderService: generated=${sched.generated} classFound=${sched.classFound} ${sched.passed}/${sched.total} tests  ${sched.latencyMs}ms${sched.error ? "  ERR: " + sched.error : ""}`);

    // Totals
    const lcPassed = modelEntry.leetcode.reduce((s: number, r: any) => s + r.passed, 0);
    const lcTotal = modelEntry.leetcode.reduce((s: number, r: any) => s + r.total, 0);
    const avgLat = Math.round(modelEntry.leetcode.reduce((s: number, r: any) => s + r.latencyMs, 0) / modelEntry.leetcode.length);
    modelEntry.summary = { lcPassed, lcTotal, lcRate: lcPassed / lcTotal, schedPassed: sched.passed, schedTotal: sched.total, avgLatencyMs: avgLat };
    console.log(`\n  SUMMARY: LeetCode ${lcPassed}/${lcTotal} (${((lcPassed / lcTotal) * 100).toFixed(0)}%)  |  Scheduler ${sched.passed}/${sched.total}  |  avg ${avgLat}ms`);

    out.models.push(modelEntry);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\n\nWrote ${OUT_FILE}`);
  console.log(`Saved generated answers under ${ANSWERS_DIR}/`);
}

// Export the scheduler harness so saved answers can be re-run elsewhere.
export { runSchedulerTests };

// Only auto-run when invoked directly (not when imported by run-answer.ts).
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
