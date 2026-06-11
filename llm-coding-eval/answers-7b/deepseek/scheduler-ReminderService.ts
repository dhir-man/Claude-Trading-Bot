import { v4 as uuidv4 } from 'uuid';

type RepeatInterval = "once" | "daily" | "weekly" | "monthly";

interface Reminder {
  id: string;            // UUID v4
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
  repeat?: RepeatInterval;    // default: "once"
  tags?: string[];            // default: []
}

class ReminderService {
  private reminders = new Map<string, Reminder>();

  create(input: CreateReminderInput): Reminder {
    const id = uuidv4();
    const repeat = input.repeat ?? "once";
    const tags = input.tags ?? [];
    const reminder: Reminder = { ...input, id, repeat, tags, completed: false, createdAt: new Date() };
    this.reminders.set(id, reminder);
    return reminder;
  }

  getById(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  listAll(): Reminder[] {
    return Array.from(this.reminders.values());
  }

  listPending(): Reminder[] {
    const now = new Date();
    return this.listAll().filter(r => !r.completed && r.dueAt >= now);
  }

  listOverdue(): Reminder[] {
    const now = new Date();
    return this.listAll().filter(r => !r.completed && r.dueAt < now);
  }

  complete(id: string): Reminder {
    const reminder = this.getById(id);
    if (!reminder) throw new Error(`Reminder ${id} not found`);
    reminder.completed = true;
    return reminder;
  }

  delete(id: string): boolean {
    return this.reminders.delete(id);
  }

  getDueWithin(minutes: number): Reminder[] {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    return this.listPending().filter(r => r.dueAt <= now);
  }

  reschedule(id: string, newDueAt: Date): Reminder {
    const reminder = this.getById(id);
    if (!reminder) throw new Error(`Reminder ${id} not found`);
    reminder.dueAt = newDueAt;
    return reminder;
  }
}

module.exports = { ReminderService };