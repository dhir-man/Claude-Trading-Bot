/**
 * Scheduler App Evaluation Suite (structured prompt — interface given)
 *
 * The model is given a full TypeScript interface spec and asked to implement
 * the ReminderService class. 25 behavioural tests are run against the output.
 * Responses are saved to outputs/<model>/scheduler/<slug>/
 *
 * Run:
 *   MODEL=claude   npx jest tests/scheduler.test.ts --runInBand
 *   MODEL=qwen7b   npx jest tests/scheduler.test.ts --runInBand
 *   MODEL=litellm  npx jest tests/scheduler.test.ts --runInBand
 *   MODEL=langchain npx jest tests/scheduler.test.ts --runInBand
 */
import dotenv from "dotenv";
dotenv.config();

import { buildClient, ModelKey } from "../src/clients";
import { CompletionRequest } from "../src/clients/types";
import { extractCode, evalCode } from "../src/utils/extract-code";
import { writeOutput } from "../src/utils/output-writer";
import { log } from "../src/utils/logger";
import { SCHEDULER_APP_PROMPT } from "../src/scheduler/prompt";
import { ReminderService } from "../src/scheduler/types";

const MODEL_KEY = (process.env.MODEL as ModelKey) ?? "claude";
const client = buildClient(MODEL_KEY);

let ServiceClass: new () => ReminderService;
let service: ReminderService;
let rawResponse = "";
let generatedCode = "";
let generationLatencyMs = 0;
let generationTokens = 0;
let generationCost = 0;

const FUTURE = (offsetMinutes: number): Date =>
  new Date(Date.now() + offsetMinutes * 60_000);
const PAST = (offsetMinutes: number): Date =>
  new Date(Date.now() - offsetMinutes * 60_000);

describe(`Scheduler App — ${MODEL_KEY}`, () => {
  beforeAll(async () => {
    log.section(`Generating ReminderService via ${MODEL_KEY}...`);

    const req: CompletionRequest = {
      messages: [
        { role: "system", content: "You are an expert TypeScript engineer. Respond ONLY with a ```typescript code block." },
        { role: "user", content: SCHEDULER_APP_PROMPT },
      ],
      temperature: 0.05,
      maxTokens: 3000,
    };

    const res = await client.complete(req);
    rawResponse = res.content;
    generationLatencyMs = res.latencyMs;
    generationTokens = res.totalTokens;
    generationCost = res.costUsd ?? 0;

    log.info(`Generated in ${generationLatencyMs}ms, ${generationTokens} tokens`);
    generatedCode = extractCode(res.content);

    const exports = evalCode(generatedCode);
    ServiceClass = exports["ReminderService"] as new () => ReminderService;

    if (typeof ServiceClass !== "function") {
      throw new Error(`ReminderService class not exported. Got: ${JSON.stringify(Object.keys(exports))}`);
    }
  });

  beforeEach(() => {
    service = new ServiceClass();
  });

  afterAll(() => {
    log.info(`Generation: ${generationLatencyMs}ms | ${generationTokens} tokens | $${generationCost.toFixed(5)}`);
    writeOutput({
      model: client.modelId,
      suite: "scheduler",
      slug: "reminder-service",
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

  describe("create()", () => {
    test("creates a reminder with required fields", () => {
      const r = service.create({ title: "Team standup", dueAt: FUTURE(30) });
      expect(r.id).toBeTruthy();
      expect(r.title).toBe("Team standup");
      expect(r.completed).toBe(false);
      expect(r.repeat).toBe("once");
      expect(Array.isArray(r.tags)).toBe(true);
      expect(r.createdAt).toBeInstanceOf(Date);
    });

    test("creates reminder with all optional fields", () => {
      const due = FUTURE(60);
      const r = service.create({ title: "Weekly review", description: "Review tasks", dueAt: due, repeat: "weekly", tags: ["work", "review"] });
      expect(r.description).toBe("Review tasks");
      expect(r.repeat).toBe("weekly");
      expect(r.tags).toEqual(expect.arrayContaining(["work", "review"]));
    });

    test("each reminder gets a unique id", () => {
      const r1 = service.create({ title: "A", dueAt: FUTURE(10) });
      const r2 = service.create({ title: "B", dueAt: FUTURE(20) });
      const r3 = service.create({ title: "C", dueAt: FUTURE(30) });
      expect(new Set([r1.id, r2.id, r3.id]).size).toBe(3);
    });

    test("defaults repeat to 'once'", () => {
      const r = service.create({ title: "X", dueAt: FUTURE(5) });
      expect(r.repeat).toBe("once");
    });
  });

  describe("getById()", () => {
    test("returns the correct reminder", () => {
      const r = service.create({ title: "Find me", dueAt: FUTURE(5) });
      const found = service.getById(r.id);
      expect(found?.title).toBe("Find me");
    });

    test("returns undefined for unknown id", () => {
      expect(service.getById("nonexistent")).toBeUndefined();
    });
  });

  describe("listAll()", () => {
    test("returns empty array when no reminders", () => {
      expect(service.listAll()).toEqual([]);
    });

    test("returns all created reminders", () => {
      service.create({ title: "A", dueAt: FUTURE(10) });
      service.create({ title: "B", dueAt: FUTURE(20) });
      service.create({ title: "C", dueAt: PAST(10) });
      expect(service.listAll()).toHaveLength(3);
    });
  });

  describe("listPending()", () => {
    test("returns only future, incomplete reminders", () => {
      const future = service.create({ title: "Future", dueAt: FUTURE(60) });
      service.create({ title: "Past", dueAt: PAST(60) });
      expect(service.listPending().some((r) => r.id === future.id)).toBe(true);
    });

    test("excludes completed reminders", () => {
      const r = service.create({ title: "Done", dueAt: FUTURE(5) });
      service.complete(r.id);
      expect(service.listPending().some((x) => x.id === r.id)).toBe(false);
    });
  });

  describe("listOverdue()", () => {
    test("returns past incomplete reminders", () => {
      const past = service.create({ title: "Overdue task", dueAt: PAST(120) });
      expect(service.listOverdue().some((r) => r.id === past.id)).toBe(true);
    });

    test("excludes future reminders", () => {
      const future = service.create({ title: "Not yet", dueAt: FUTURE(60) });
      expect(service.listOverdue().some((r) => r.id === future.id)).toBe(false);
    });

    test("excludes completed past reminders", () => {
      const r = service.create({ title: "Done late", dueAt: PAST(30) });
      service.complete(r.id);
      expect(service.listOverdue().some((x) => x.id === r.id)).toBe(false);
    });
  });

  describe("complete()", () => {
    test("marks reminder as completed", () => {
      const r = service.create({ title: "Do laundry", dueAt: FUTURE(60) });
      const updated = service.complete(r.id);
      expect(updated.completed).toBe(true);
    });

    test("throws for unknown id", () => {
      expect(() => service.complete("ghost")).toThrow(/not found/i);
    });
  });

  describe("delete()", () => {
    test("removes reminder and returns true", () => {
      const r = service.create({ title: "Delete me", dueAt: FUTURE(5) });
      expect(service.delete(r.id)).toBe(true);
      expect(service.getById(r.id)).toBeUndefined();
    });

    test("returns false for unknown id", () => {
      expect(service.delete("nowhere")).toBe(false);
    });
  });

  describe("getDueWithin()", () => {
    test("returns reminders due within window", () => {
      const soon = service.create({ title: "Soon", dueAt: FUTURE(10) });
      const later = service.create({ title: "Later", dueAt: FUTURE(120) });
      const due15 = service.getDueWithin(15);
      expect(due15.some((r) => r.id === soon.id)).toBe(true);
      expect(due15.some((r) => r.id === later.id)).toBe(false);
    });

    test("excludes overdue reminders", () => {
      const past = service.create({ title: "Late", dueAt: PAST(5) });
      expect(service.getDueWithin(30).some((r) => r.id === past.id)).toBe(false);
    });
  });

  describe("reschedule()", () => {
    test("updates dueAt and returns reminder", () => {
      const r = service.create({ title: "Move it", dueAt: FUTURE(5) });
      const newDue = FUTURE(200);
      const updated = service.reschedule(r.id, newDue);
      expect(updated.dueAt.getTime()).toBe(newDue.getTime());
    });

    test("throws for unknown id", () => {
      expect(() => service.reschedule("ghost", FUTURE(60))).toThrow(/not found/i);
    });
  });

  describe("Integration: full workflow", () => {
    test("create → list → complete → overdue flow", () => {
      const r1 = service.create({ title: "Meeting",  dueAt: FUTURE(30), repeat: "daily",   tags: ["work"] });
      const r2 = service.create({ title: "Call mom", dueAt: FUTURE(5),  repeat: "once",    tags: ["personal"] });
      const r3 = service.create({ title: "Pay rent", dueAt: PAST(10),   repeat: "monthly", tags: ["finance"] });
      const r4 = service.create({ title: "Buy milk", dueAt: PAST(60),   repeat: "once",    tags: ["personal"] });

      expect(service.listAll()).toHaveLength(4);
      expect(service.listPending().length).toBeGreaterThanOrEqual(2);
      expect(service.listOverdue().length).toBeGreaterThanOrEqual(2);

      service.complete(r1.id);
      expect(service.listPending().some((r) => r.id === r1.id)).toBe(false);

      service.reschedule(r3.id, FUTURE(120));
      expect(service.listOverdue().some((r) => r.id === r3.id)).toBe(false);
      expect(service.listPending().some((r) => r.id === r3.id)).toBe(true);

      expect(service.getDueWithin(10).some((r) => r.id === r2.id)).toBe(true);

      service.delete(r4.id);
      expect(service.listAll()).toHaveLength(3);
    });
  });
});
