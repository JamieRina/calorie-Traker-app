import { z } from "zod";
import { prisma } from "../../config/prisma";
import { getReminderQueue } from "../../jobs/queue";
import { createReminderSchema } from "./reminders.validators";

type CreateReminderInput = z.infer<typeof createReminderSchema>;

export class RemindersService {
  async create(userId: string, input: CreateReminderInput) {
    const reminderQueue = getReminderQueue();

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        ...input
      }
    });

    await reminderQueue.add(
      "schedule-reminder",
      {
        reminderId: reminder.id,
        userId
      },
      {
        jobId: `reminder:${reminder.id}`,
        repeat: {
          pattern: input.scheduleCron,
          tz: input.timezone
        }
      }
    );

    return reminder;
  }

  async list(userId: string) {
    return prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
}

export const remindersService = new RemindersService();
