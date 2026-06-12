/**
 * Manually exercise a generated ReminderService — run the CLASS itself, no
 * test suite. Loads a saved scheduler answer, instantiates it, and either:
 *
 *   • runs a narrated demo calling each method and printing the result, or
 *   • drops you into a Node REPL with a live `svc` instance + helpers, so you
 *     can call methods by hand.
 *
 * Usage:
 *   npx ts-node src/try-scheduler.ts [path-to-answer.ts] [--repl]
 *   node dist/try-scheduler.js [path-to-answer.ts] [--repl]
 *
 * Examples:
 *   node dist/try-scheduler.js                       # demo, default answer
 *   node dist/try-scheduler.js answers-32b/qwen7b/scheduler-ReminderService.ts
 *   node dist/try-scheduler.js answers-frontier/claude-opus/scheduler-ReminderService.ts --repl
 */
import * as fs from "fs";
import * as path from "path";
import * as repl from "repl";
import { evalCode } from "./utils/extract-code";

const DEFAULT_ANSWER = "answers-frontier/claude-opus/scheduler-ReminderService.ts";

function loadService(file: string): any {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const code = fs.readFileSync(file, "utf-8");
  const exports = evalCode(code);
  const ServiceClass = exports["ReminderService"] as any;
  if (typeof ServiceClass !== "function") {
    console.error("This file does not export a ReminderService class.");
    process.exit(1);
  }
  return ServiceClass;
}

const FUTURE = (min: number) => new Date(Date.now() + min * 60_000);
const PAST = (min: number) => new Date(Date.now() - min * 60_000);

function show(label: string, value: unknown): void {
  console.log(`\n▶ ${label}`);
  console.log(JSON.stringify(value, null, 2));
}

function demo(ServiceClass: any): void {
  console.log("\n" + "=".repeat(64));
  console.log("  ReminderService — manual walkthrough (calling the class directly)");
  console.log("=".repeat(64));

  const svc = new ServiceClass();

  const a = svc.create({ title: "Pay rent", dueAt: PAST(30), tags: ["bills"] });
  show("create() — overdue reminder", a);

  const b = svc.create({ title: "Standup", dueAt: FUTURE(10), repeat: "daily" });
  show("create() — upcoming, repeat daily", b);

  const c = svc.create({ title: "Dentist", dueAt: FUTURE(180) });
  show("create() — far future", c);

  show("getById(a.id)", svc.getById(a.id));
  show("getById('missing')", svc.getById("missing"));
  show("listAll()", svc.listAll());
  show("listPending()  (future + incomplete)", svc.listPending());
  show("listOverdue()  (past + incomplete)", svc.listOverdue());
  show("getDueWithin(15)  (due in next 15 min)", svc.getDueWithin(15));

  show("complete(b.id)", svc.complete(b.id));
  show("listPending()  after completing standup", svc.listPending());

  show("reschedule(a.id → +120 min)", svc.reschedule(a.id, FUTURE(120)));
  show("listOverdue()  after rescheduling rent", svc.listOverdue());

  show("delete(c.id)", svc.delete(c.id));
  show("listAll()  after delete", svc.listAll());

  try {
    svc.complete("ghost");
  } catch (e) {
    console.log(`\n▶ complete('ghost') correctly threw: ${(e as Error).message}`);
  }

  console.log("\nDone. Re-run with --repl to call methods yourself.\n");
}

function startRepl(ServiceClass: any): void {
  const svc = new ServiceClass();
  console.log("\nInteractive ReminderService REPL.");
  console.log("In scope: svc (a live instance), FUTURE(min), PAST(min).");
  console.log("Try:  svc.create({ title: 'Test', dueAt: FUTURE(5) })");
  console.log("      svc.listPending()\n");
  const r = repl.start({ prompt: "scheduler> " });
  r.context.svc = svc;
  r.context.ServiceClass = ServiceClass;
  r.context.FUTURE = FUTURE;
  r.context.PAST = PAST;
}

function main(): void {
  const args = process.argv.slice(2);
  const useRepl = args.includes("--repl");
  const file = args.find((a) => !a.startsWith("--")) ?? DEFAULT_ANSWER;

  console.log(`Loading ReminderService from: ${file}`);
  const ServiceClass = loadService(file);

  if (useRepl) startRepl(ServiceClass);
  else demo(ServiceClass);
}

main();
