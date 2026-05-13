import { z } from "zod";
import { ReminderType } from "../../lib/domain-enums";

export const createReminderSchema = z.object({
  type: z.nativeEnum(ReminderType),
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(2).max(240),
  scheduleCron: z.string().trim().min(5).max(120),
  timezone: z.string().trim().min(1).max(80).default("Europe/London")
});
