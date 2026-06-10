export const SCHEDULER_APP_PROMPT = `You are an expert TypeScript/Node.js engineer.

Build a complete, production-quality Reminder/Scheduler app in TypeScript.

## Requirements

Implement the following TypeScript class and export it:

\`\`\`typescript
type RepeatInterval = "once" | "daily" | "weekly" | "monthly";

interface Reminder {
  id: string;           // UUID v4
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
  repeat?: RepeatInterval;   // default: "once"
  tags?: string[];           // default: []
}

class ReminderService {
  create(input: CreateReminderInput): Reminder;
  getById(id: string): Reminder | undefined;
  listAll(): Reminder[];
  listPending(): Reminder[];    // not completed, dueAt >= now
  listOverdue(): Reminder[];    // not completed, dueAt < now
  complete(id: string): Reminder;  // throws if not found
  delete(id: string): boolean;
  getDueWithin(minutes: number): Reminder[];  // pending reminders due within N minutes
  reschedule(id: string, newDueAt: Date): Reminder;  // throws if not found
}
\`\`\`

## Implementation requirements
1. Use \`crypto.randomUUID()\` or a simple counter-based ID generator for IDs.
2. Store reminders in an in-memory Map<string, Reminder>.
3. \`listPending()\` returns reminders where completed === false AND dueAt >= now.
4. \`listOverdue()\` returns reminders where completed === false AND dueAt < now.
5. \`getDueWithin(minutes)\` returns pending reminders where dueAt is between now and now+minutes.
6. All methods that take an id throw \`new Error(\`Reminder \${id} not found\`)\` if not found.
7. \`complete()\` and \`reschedule()\` mutate in-place and return the updated reminder.

## Output format
Respond with ONLY a \`\`\`typescript code block containing the implementation.
End with: module.exports = { ReminderService };`;
