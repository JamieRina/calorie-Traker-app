import { z } from "zod";

export const createProgressSchema = z.object({
  weightKg: z.number().positive().optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  mood: z.string().max(40).optional(),
  note: z.string().max(240).optional(),
  recordedAt: z.string().datetime()
});
