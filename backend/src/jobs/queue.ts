import { Queue } from "bullmq";
import { env } from "../config/env";
import { redis } from "../config/redis";

let reminderQueue: Queue | null = null;

export function getReminderQueue() {
  if (!reminderQueue) {
    reminderQueue = new Queue(env.REMINDER_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000
        },
        removeOnComplete: 1000,
        removeOnFail: 1000
      }
    });
  }

  return reminderQueue;
}
