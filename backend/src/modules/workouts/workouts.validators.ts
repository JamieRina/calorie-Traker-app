import { z } from "zod";

export const createWorkoutSchema = z.object({
  title: z.string().trim().min(2).max(80),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  durationMin: z.number().int().positive().max(1440).optional(),
  performedAt: z.string().datetime(),
  notes: z.string().trim().max(240).optional()
});
