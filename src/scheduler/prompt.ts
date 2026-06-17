export const SCHEDULER_APP_PROMPT = `
Build a production-quality in-memory \`ReminderService\` class in TypeScript.

## Interface

\`\`\`typescript
type RepeatInterval = "once" | "daily" | "weekly" | "monthly";

interface Reminder {
  id: string;           // unique, use crypto.randomUUID() or a counter
  title: string;
  description?: string;
  dueAt: Date;
  repeat: RepeatInterval;
  tags: string[];
  completed: boolean;
  createdAt: Date;
}

interface CreateReminderInput {
  title: string;
  description?: string;
  dueAt: Date;
  repeat?: RepeatInterval;  // defaults to "once"
  tags?: string[];          // defaults to []
}
\`\`\`

## Methods to implement

- \`create(input: CreateReminderInput): Reminder\`
- \`getById(id: string): Reminder | undefined\`
- \`listAll(): Reminder[]\`
- \`listPending(): Reminder[]\`    — future, incomplete
- \`listOverdue(): Reminder[]\`    — past, incomplete
- \`complete(id: string): Reminder\`  — throws "Reminder {id} not found" if missing
- \`delete(id: string): boolean\`
- \`getDueWithin(minutes: number): Reminder[]\` — pending reminders due within window
- \`reschedule(id: string, newDueAt: Date): Reminder\` — throws if not found

## Rules
- Store reminders in an in-memory \`Map<string, Reminder>\`.
- \`listPending\` returns incomplete reminders with \`dueAt >= now\`.
- \`listOverdue\` returns incomplete reminders with \`dueAt < now\`.
- Throw with message \`"Reminder {id} not found"\` when an id is invalid.

Respond with a single \`\`\`typescript code block.
End with: \`module.exports = { ReminderService };\`
`.trim();
