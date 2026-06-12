import { randomUUID } from "crypto";

type RepeatInterval = "once" | "daily" | "weekly" | "monthly";

interface Reminder {
  id: string;
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
  repeat?: RepeatInterval;
  tags?: string[];
}

class ReminderService {
  private reminders = new Map<string, Reminder>();

  create(input: CreateReminderInput): Reminder {
    const reminder: Reminder = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
      repeat: input.repeat ?? "once",
      tags: input.tags ?? [],
      completed: false,
      createdAt: new Date(),
    };
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  getById(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  listAll(): Reminder[] {
    return Array.from(this.reminders.values());
  }

  listPending(): Reminder[] {
    const now = Date.now();
    return this.listAll().filter(
      (r) => !r.completed && r.dueAt.getTime() >= now
    );
  }

  listOverdue(): Reminder[] {
    const now = Date.now();
    return this.listAll().filter(
      (r) => !r.completed && r.dueAt.getTime() < now
    );
  }

  complete(id: string): Reminder {
    const reminder = this.requireById(id);
    reminder.completed = true;
    return reminder;
  }

  delete(id: string): boolean {
    return this.reminders.delete(id);
  }

  getDueWithin(minutes: number): Reminder[] {
    const now = Date.now();
    const cutoff = now + minutes * 60_000;
    return this.listAll().filter(
      (r) =>
        !r.completed &&
        r.dueAt.getTime() >= now &&
        r.dueAt.getTime() <= cutoff
    );
  }

  reschedule(id: string, newDueAt: Date): Reminder {
    const reminder = this.requireById(id);
    reminder.dueAt = newDueAt;
    return reminder;
  }

  private requireById(id: string): Reminder {
    const reminder = this.reminders.get(id);
    if (!reminder) throw new Error(`Reminder ${id} not found`);
    return reminder;
  }
}

module.exports = { ReminderService };
