import { z } from "zod";

export const createProgressSchema = z.object({
  weightKg: z.number().min(25).max(350).optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  mood: z.string().trim().max(40).optional(),
  note: z.string().trim().max(240).optional(),
  recordedAt: z.string().datetime()
});
