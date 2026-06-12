import { v4 as uuidv4 } from 'uuid';

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
  private reminders: Map<string, Reminder> = new Map();

  create(input: CreateReminderInput): Reminder {
    const id = uuidv4();
    const reminder: Reminder = {
      id,
      title: input.title,
      description: input.description || "",
      dueAt: input.dueAt,
      repeat: input.repeat || "once",
      tags: input.tags || [],
      completed: false,
      createdAt: new Date(),
    };
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
    return Array.from(this.reminders.values()).filter(reminder => !reminder.completed && reminder.dueAt >= now);
  }

  listOverdue(): Reminder[] {
    const now = new Date();
    return Array.from(this.reminders.values()).filter(reminder => !reminder.completed && reminder.dueAt < now);
  }

  complete(id: string): Reminder {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      throw new Error(`Reminder ${id} not found`);
    }
    reminder.completed = true;
    return reminder;
  }

  delete(id: string): boolean {
    return this.reminders.delete(id);
  }

  getDueWithin(minutes: number): Reminder[] {
    const now = new Date();
    const dueBy = new Date(now.getTime() + minutes * 60 * 1000);
    return Array.from(this.reminders.values()).filter(reminder => !reminder.completed && reminder.dueAt >= now && reminder.dueAt <= dueBy);
  }

  reschedule(id: string, newDueAt: Date): Reminder {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      throw new Error(`Reminder ${id} not found`);
    }
    reminder.dueAt = newDueAt;
    return reminder;
  }
}

module.exports = { ReminderService };