import { Worker } from "bullmq";
import { env } from "../config/env";
import { redis } from "../config/redis";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

const worker = new Worker(
  env.REMINDER_QUEUE_NAME,
  async (job) => {
    const reminderId = String(job.data.reminderId);
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { user: true }
    });

    if (!reminder) {
      logger.warn({ reminderId }, "Reminder missing or disabled");
      return;
    }

    if (!reminder.isEnabled) {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          lastAttemptAt: new Date(),
          lastAttemptStatus: "skipped",
          lastErrorMessage: "Reminder disabled"
        }
      });

      logger.warn({ reminderId }, "Reminder missing or disabled");
      return;
    }

    try {
      // TODO: replace this with real push/email delivery.
      logger.info(
        {
          reminderId,
          userId: reminder.userId,
          title: reminder.title
        },
        "Reminder dispatched"
      );

      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          lastSentAt: new Date(),
          lastAttemptAt: new Date(),
          lastAttemptStatus: "sent",
          lastErrorMessage: null,
          deliveryCount: {
            increment: 1
          }
        }
      });
    } catch (error) {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          lastAttemptAt: new Date(),
          lastAttemptStatus: "failed",
          lastErrorMessage:
            error instanceof Error ? error.message : "Unknown reminder delivery error"
        }
      });

      throw error;
    }
  },
  {
    connection: redis
  }
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Reminder job completed");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Reminder job failed");
});
