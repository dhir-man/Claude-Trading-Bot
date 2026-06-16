export type RepeatInterval = "once" | "daily" | "weekly" | "monthly";

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueAt: Date;
  repeat: RepeatInterval;
  tags: string[];
  completed: boolean;
  createdAt: Date;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  dueAt: Date;
  repeat?: RepeatInterval;
  tags?: string[];
}

export interface ReminderService {
  create(input: CreateReminderInput): Reminder;
  getById(id: string): Reminder | undefined;
  listAll(): Reminder[];
  listPending(): Reminder[];
  listOverdue(): Reminder[];
  complete(id: string): Reminder;
  delete(id: string): boolean;
  getDueWithin(minutes: number): Reminder[];
  reschedule(id: string, newDueAt: Date): Reminder;
}
