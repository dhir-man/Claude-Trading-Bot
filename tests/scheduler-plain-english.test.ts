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

/**
 * Detect what field name the model used for the due date by creating a probe
 * reminder and inspecting which field is a Date object.
 */
let dueDateField = "dueAt"; // will be updated in beforeAll

function makeInput(title: string, due: Date, extra: Record<string, unknown> = {}): Record<string, unknown> {
  // Pass all common field names so the model finds whichever one it reads
  return { title, dueAt: due, dueDate: due, due: due, scheduledAt: due, date: due, time: due, ...extra };
}

/** Collect all method names on an object including its prototype chain. */
function allMethods(obj: object): string[] {
  const names = new Set<string>();
  let proto = obj;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto)
      .filter((n) => typeof (obj as Record<string, unknown>)[n] === "function" && n !== "constructor")
      .forEach((n) => names.add(n));
    proto = Object.getPrototypeOf(proto) as object;
  }
  return Array.from(names);
}

/** Try multiple method name aliases — the LLM might name them slightly differently. */
function callMethod(svc: Record<string, unknown>, primaryName: string, ...args: unknown[]): unknown {
  const aliases: Record<string, string[]> = {
    create:       ["create", "add", "addReminder", "createReminder", "addTask", "createTask"],
    getById:      ["getById", "findById", "get", "getReminder", "findReminder", "getReminderById", "getTask"],
    listAll:      ["listAll", "getAll", "all", "list", "getAllReminders", "listAllReminders", "getReminders", "listReminders", "getAll"],
    listPending:  ["listPending", "getPending", "pending", "getPendingReminders", "listPendingReminders", "getPending"],
    listOverdue:  ["listOverdue", "getOverdue", "overdue", "getOverdueReminders", "listOverdueReminders", "getOverdue"],
    complete:     ["complete", "markComplete", "markDone", "done", "finish", "markCompleted", "markAsDone", "markAsComplete"],
    delete:       ["delete", "remove", "deleteReminder", "removeReminder", "deleteTask"],
    getDueWithin: ["getDueWithin", "dueWithin", "getDueSoon", "getDueInMinutes", "getUpcoming",
                   "getRemidersDueWithinMinutes", "getRemindersDueWithinMinutes", "getDueWithinMinutes",
                   "getDueWithinNextMinutes", "getRemindersWithin", "getUpcomingReminders",
                   "getRemindersWithinNextNMinutes", "getDueRemindersWithin", "remindersDueWithin"],
    reschedule:   ["reschedule", "updateDue", "setDueAt", "moveTo", "postpone", "rescheduleReminder", "updateDueDate"],
  };

  const candidates = aliases[primaryName] ?? [primaryName];
  const methods = allMethods(svc);
  for (const name of candidates) {
    if (methods.includes(name)) {
      return ((svc as Record<string, (...a: unknown[]) => unknown>)[name])(...args);
    }
  }
  // Fuzzy fallback: find a method whose name contains all words in the primary name split by camelCase
  const fuzzyWords = primaryName.replace(/([A-Z])/g, " $1").toLowerCase().trim().split(" ").filter(Boolean);
  const fuzzyMatch = methods.find((m) =>
    fuzzyWords.every((w) => m.toLowerCase().includes(w))
  );
  if (fuzzyMatch) {
    return ((svc as Record<string, (...a: unknown[]) => unknown>)[fuzzyMatch])(...args);
  }
  throw new Error(`No method found for "${primaryName}". Available methods: ${methods.join(", ")}`);
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

    // Detect the due date field name the model chose
    const probe = new ServiceClass();
    try {
      const probeInput: Record<string, unknown> = { title: "_probe", dueAt: FUTURE(5) };
      const probeResult = callMethod(probe, "create", probeInput) as Record<string, unknown>;
      // If dueAt is undefined in result, the model uses a different field name
      if (probeResult.dueAt instanceof Date) {
        dueDateField = "dueAt";
      } else {
        // Try common alternatives
        for (const candidate of ["dueDate", "due", "scheduledAt", "date", "time"]) {
          if (probeResult[candidate] instanceof Date) {
            dueDateField = candidate;
            break;
          }
        }
      }
    } catch { /* ignore probe errors */ }
    log.info(`Detected due date field: "${dueDateField}"`);
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
      const r = callMethod(service, "create", makeInput("Standup", FUTURE(30))) as Record<string, unknown>;
      expect(r).toBeDefined();
      expect(r.id ?? r.ID ?? r.uid).toBeTruthy();
    });

    test("created reminder has title property", () => {
      const r = callMethod(service, "create", makeInput("My task", FUTURE(10))) as Record<string, unknown>;
      expect(r.title ?? r.name ?? r.text).toBe("My task");
    });

    test("created reminder starts as not completed", () => {
      const r = callMethod(service, "create", makeInput("Fresh", FUTURE(5))) as Record<string, unknown>;
      const done = r.completed ?? r.done ?? r.isDone ?? r.finished ?? r.complete;
      expect(done).toBeFalsy();
    });

    test("two reminders get different IDs", () => {
      const r1 = callMethod(service, "create", makeInput("A", FUTURE(5))) as Record<string, unknown>;
      const r2 = callMethod(service, "create", makeInput("B", FUTURE(10))) as Record<string, unknown>;
      const id1 = r1.id ?? r1.ID ?? r1.uid;
      const id2 = r2.id ?? r2.ID ?? r2.uid;
      expect(id1).not.toBe(id2);
    });
  });

  describe("Listing", () => {
    test("listAll returns all created reminders", () => {
      callMethod(service, "create", makeInput("A", FUTURE(10)));
      callMethod(service, "create", makeInput("B", FUTURE(20)));
      callMethod(service, "create", makeInput("C", PAST(10)));
      const all = callMethod(service, "listAll") as unknown[];
      expect(all.length).toBeGreaterThanOrEqual(3);
    });

    test("listPending includes future incomplete reminders", () => {
      const r = callMethod(service, "create", makeInput("Upcoming", FUTURE(60))) as Record<string, unknown>;
      const pending = callMethod(service, "listPending") as Record<string, unknown>[];
      const id = r.id ?? r.ID ?? r.uid;
      expect(pending.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(true);
    });

    test("listOverdue includes past incomplete reminders", () => {
      const r = callMethod(service, "create", makeInput("Late", PAST(90))) as Record<string, unknown>;
      const overdue = callMethod(service, "listOverdue") as Record<string, unknown>[];
      const id = r.id ?? r.ID ?? r.uid;
      expect(overdue.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(true);
    });
  });

  describe("Completion", () => {
    test("complete marks reminder as done", () => {
      const r = callMethod(service, "create", makeInput("Wash car", FUTURE(60))) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      const updated = callMethod(service, "complete", id) as Record<string, unknown>;
      const done = updated.completed ?? updated.done ?? updated.isDone ?? updated.finished ?? updated.complete;
      expect(done).toBeTruthy();
    });

    test("completed reminder no longer in pending", () => {
      const r = callMethod(service, "create", makeInput("Done", FUTURE(5))) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      callMethod(service, "complete", id);
      const pending = callMethod(service, "listPending") as Record<string, unknown>[];
      expect(pending.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(false);
    });
  });

  describe("Deletion", () => {
    test("delete removes the reminder", () => {
      const r = callMethod(service, "create", makeInput("Remove me", FUTURE(5))) as Record<string, unknown>;
      const id = r.id ?? r.ID ?? r.uid;
      callMethod(service, "delete", id);
      const all = callMethod(service, "listAll") as Record<string, unknown>[];
      expect(all.some((p) => (p.id ?? p.ID ?? p.uid) === id)).toBe(false);
    });
  });

  describe("getDueWithin", () => {
    test("returns items due soon but not items due much later", () => {
      const soon  = callMethod(service, "create", makeInput("Soon", FUTURE(5))) as Record<string, unknown>;
      const later = callMethod(service, "create", makeInput("Later", FUTURE(120))) as Record<string, unknown>;
      const due = callMethod(service, "getDueWithin", 15) as Record<string, unknown>[];
      expect(due.some((p) => (p.id ?? p.ID ?? p.uid) === (soon.id ?? soon.ID ?? soon.uid))).toBe(true);
      expect(due.some((p) => (p.id ?? p.ID ?? p.uid) === (later.id ?? later.ID ?? later.uid))).toBe(false);
    });
  });

  describe("Reschedule", () => {
    test("reschedule changes the due date", () => {
      const r = callMethod(service, "create", makeInput("Move it", FUTURE(5))) as Record<string, unknown>;
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
