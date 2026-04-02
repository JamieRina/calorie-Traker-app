import { z } from "zod";
import { ReminderType } from "../../lib/domain-enums";

export const createReminderSchema = z.object({
  type: z.nativeEnum(ReminderType),
  title: z.string().min(2),
  body: z.string().min(2),
  scheduleCron: z.string().min(5),
  timezone: z.string().default("Europe/London")
});
