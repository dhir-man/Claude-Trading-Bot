/**
 * Scheduler App — Plain English Evaluation Suite
 *
 * Unlike scheduler.test.ts, this test gives the LLM NO TypeScript interfaces,
 * NO method signatures, NO class scaffolding — only a plain English description
 * of what the app should do.
 *
 * The generated class is then probed dynamically: we check that a ReminderService
 * class was exported and that it behaves correctly by calling the methods the
 * LLM chose to name (falling back to common aliases if needed).
 *
 * Responses are saved to outputs/<model>/scheduler-plain-english/
 *
 * Run:
 *   MODEL=claude   npx jest tests/scheduler-plain-english.test.ts --runInBand
 *   MODEL=qwen7b   npx jest tests/scheduler-plain-english.test.ts --runInBand
 *   MODEL=litellm  npx jest tests/scheduler-plain-english.test.ts --runInBand
 *   MODEL=langchain npx jest tests/scheduler-plain-english.test.ts --runInBand
 */
import dotenv from "dotenv";
dotenv.config();

import { buildClient, ModelKey } from "../src/clients";
import { CompletionRequest } from "../src/clients/types";
import { extractCode, evalCode } from "../src/utils/extract-code";
import { writeOutput } from "../src/utils/output-writer";
import { log } from "../src/utils/logger";
import { SCHEDULER_PLAIN_ENGLISH_PROMPT } from "../src/scheduler/prompt-plain-english";

const MODEL_KEY = (process.env.MODEL as ModelKey) ?? "claude";
const client = buildClient(MODEL_KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ServiceClass: new () => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let service: any;
let rawResponse = "";
let generatedCode = "";
let generationLatencyMs = 0;
let generationTokens = 0;
let generationCost = 0;

const FUTURE = (offsetMinutes: number): Date =>
  new Date(Date.now() + offsetMinutes * 60_000);
const PAST = (offsetMinutes: number): Date =>
  new Date(Date.now() - offsetMinutes * 60_000);

/** Try multiple method name aliases — the LLM might name them slightly differently. */
function callMethod(svc: Record<string, unknown>, primaryName: string, ...args: unknown[]): unknown {
  const aliases: Record<string, string[]> = {
    create:       ["create", "add", "addReminder", "createReminder"],
    getById:      ["getById", "findById", "get", "getReminder", "findReminder"],
    listAll:      ["listAll", "getAll", "all", "list", "getAllReminders"],
    listPending:  ["listPending", "getPending", "pending", "getPendingReminders"],
    listOverdue:  ["listOverdue", "getOverdue", "overdue", "getOverdueReminders"],
    complete:     ["complete", "markComplete", "markDone", "done", "finish", "markCompleted"],
    delete:       ["delete", "remove", "deleteReminder", "removeReminder"],
    getDueWithin: ["getDueWithin", "dueWithin", "getDueSoon", "getDueInMinutes", "getUpcoming"],
    reschedule:   ["reschedule", "updateDue", "setDueAt", "moveTo", "postpone"],
  };

  const candidates = aliases[primaryName] ?? [primaryName];
  for (const name of candidates) {
    if (typeof (svc as Record<string, unknown>)[name] === "function") {
      return ((svc as Record<string, (...a: unknown[]) => unknown>)[name])(...args);
    }
  }
  throw new Error(`No method found for "${primaryName}". Available: ${Object.keys(svc).join(", ")}`);
}

describe(`Scheduler App (Plain English) — ${MODEL_KEY}`, () => {
  beforeAll(async () => {
    log.section(`Plain-English Scheduler test — generating via ${MODEL_KEY}...`);

    const req: CompletionRequest = {
      messages: [
        {
          role: "system",
          content: "You are a senior TypeScript engineer. Respond ONLY with a single ```typescript code block.",
        },
        { role: "user", content: SCHEDULER_PLAIN_ENGLISH_PROMPT },
      ],
      temperature: 0.1,
      maxTokens: 3000,
    };

    const res = await client.complete(req);
    rawResponse = res.content;
    generationLatencyMs = res.latencyMs;
    generationTokens = res.totalTokens;
    generationCost = res.costUsd ?? 0;

    log.info(`Generated in ${generationLatencyMs}ms, ${generationTokens} tokens`);
    generatedCode = extractCode(res.content);
    log.dim(`First 300 chars: ${generatedCode.slice(0, 300)}`);

    const exports = evalCode(generatedCode);
    ServiceClass = (exports["ReminderService"] as new () => unknown) as new () => Record<string, unknown>;

    if (typeof ServiceClass !== "function") {
      throw new Error(
        `ReminderService class not found in exports. Got: ${JSON.stringify(Object.keys(exports))}`
      );
    }
  });

  beforeEach(() => {
    service = new ServiceClass();
  });

  afterAll(() => {
    log.info(`Generation: ${generationLatencyMs}ms | ${generationTokens} tokens | $${generationCost.toFixed(5)}`);
    writeOutput({
      model: client.modelId,
      suite: "scheduler-plain-english",
      slug: "reminder-service-plain",
      rawResponse,
      extractedCode: generatedCode,
      latencyMs: generationLatencyMs,
      tokens: generationTokens,
      costUsd: generationCost,
      passed: 0,
      total: 0,
      timestamp: new Date().toISOString(),
    });
  });

  describe("Basic creation", () => {
    test("creates a reminder and returns an object with an id", () => {
      const r = callMethod(service, "create", { title: "Standup", dueAt: FUTURE(30) }) as Record<string, unknown>;
      expect(r).toBeDefined();
      expect(r.id ?? r.ID ?? r.uid).toBeTruthy();
    });

    test("created reminder has title property", () => {
      const r = callMethod(service, "create", { title: "My task", dueAt: FUTURE(10) }) as Record<string, unknown>;
      expect(r.title ?? r.name ?? r.text).toBe("My task");
    });

    test("created reminder starts as not completed", () => {
      const r = callMethod(service, "create", { title: "Fresh", dueAt: FUTURE(5) }) as Record<string, unknown>;
      const done = r.completed ?? r.done ?? r.isDone ?? r.finished ?? r.complete;
      expect(done).toBeFalsy();
    });

    test("two reminders get different IDs", () => {
      const r1 = callMethod(service, "create", { title: "A", dueAt: FUTURE(5) }) as Record<string, unknown>;
      const r2 = callMethod(service, "create", { title: "B", dueAt: FUTURE(10) }) as Record<string, unknown>;
      const id1 = r1.id ?? r1.ID ?? r1.uid;
      const id2 = r2.id ?? r2.ID ?? r2.uid;
      expect(id1).not.toBe(id2);
    });
  });

  describe("Listing", () => {
    test("listAll returns all created reminders", () => {
      callMethod(service, "create", { title: "A", dueAt: FUTURE(10) });
      callMethod(service, "create", { title: "B", dueAt: FUTURE(20) });
      callMethod(service, "create", { title: "C", dueAt: PAST(10) });
      const all = callMethod(service, "listAll") as unknown[];
      expect(all.length).toBeGreaterThanOrEqual(3);
    });

    test("listPending includes future incomplete reminders", () => {
      const r = callMethod(service, "create", { title: "Upcoming", dueAt: FUTURE(60) }) as Record<string, unknown>;
      const pending = callMethod(service, "listPending") as Record<string, unknown>[];
      const id = r.id ?? r.ID ?? r.uid;
      expect(pending.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(true);
    });

    test("listOverdue includes past incomplete reminders", () => {
      const r = callMethod(service, "create", { title: "Late", dueAt: PAST(90) }) as Record<string, unknown>;
      const overdue = callMethod(service, "listOverdue") as Record<string, unknown>[];
      const id = r.id ?? r.ID ?? r.uid;
      expect(overdue.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(true);
    });
  });

  describe("Completion", () => {
    test("complete marks reminder as done", () => {
      const r = callMethod(service, "create", { title: "Wash car", dueAt: FUTURE(60) }) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      const updated = callMethod(service, "complete", id) as Record<string, unknown>;
      const done = updated.completed ?? updated.done ?? updated.isDone ?? updated.finished ?? updated.complete;
      expect(done).toBeTruthy();
    });

    test("completed reminder no longer in pending", () => {
      const r = callMethod(service, "create", { title: "Done", dueAt: FUTURE(5) }) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      callMethod(service, "complete", id);
      const pending = callMethod(service, "listPending") as Record<string, unknown>[];
      expect(pending.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(false);
    });
  });

  describe("Deletion", () => {
    test("delete removes the reminder", () => {
      const r = callMethod(service, "create", { title: "Remove me", dueAt: FUTURE(5) }) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      callMethod(service, "delete", id);
      const all = callMethod(service, "listAll") as Record<string, unknown>[];
      expect(all.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(false);
    });
  });

  describe("getDueWithin", () => {
    test("returns items due soon but not items due much later", () => {
      const soon  = callMethod(service, "create", { title: "Soon",  dueAt: FUTURE(5)  }) as Record<string, unknown>;
      const later = callMethod(service, "create", { title: "Later", dueAt: FUTURE(120) }) as Record<string, unknown>;
      const due = callMethod(service, "getDueWithin", 15) as Record<string, unknown>[];
      expect(due.some((p) => (p.id ?? p.ID ?? p.uid) === (soon.id ?? soon.ID ?? soon.uid))).toBe(true);
      expect(due.some((p) => (p.id ?? p.ID ?? p.uid) === (later.id ?? later.ID ?? later.uid))).toBe(false);
    });
  });

  describe("Reschedule", () => {
    test("reschedule changes the due date", () => {
      const r = callMethod(service, "create", { title: "Move it", dueAt: FUTURE(5) }) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      const newDue = FUTURE(200);
      const updated = callMethod(service, "reschedule", id, newDue) as Record<string, unknown>;
      const updatedDue = updated.dueAt ?? updated.due ?? updated.dueDate ?? updated.scheduledAt;
      const updatedTime = updatedDue instanceof Date
        ? updatedDue.getTime()
        : new Date(updatedDue as string).getTime();
      expect(Math.abs(updatedTime - newDue.getTime())).toBeLessThan(1000);
    });
  });
});
