import { z } from "zod";

export const createWorkoutSchema = z.object({
  title: z.string().min(2),
  caloriesBurned: z.number().nonnegative().optional(),
  durationMin: z.number().int().positive().optional(),
  performedAt: z.string().datetime(),
  notes: z.string().max(240).optional()
});
