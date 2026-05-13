import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { getReminderQueue } from "../../jobs/queue";
import { createReminderSchema } from "./reminders.validators";

type CreateReminderInput = z.infer<typeof createReminderSchema>;

export class RemindersService {
  async create(userId: string, input: CreateReminderInput) {
    if (env.LOCAL_BACKEND_MODE === "force_local") {
      throw new ApiError(503, "Reminders require database and Redis mode");
    }

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
    if (env.LOCAL_BACKEND_MODE === "force_local") {
      return [];
    }

    return prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
}

export const remindersService = new RemindersService();
