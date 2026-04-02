import { z } from "zod";
import { ActivityLevel, GoalType, Sex } from "../../lib/domain-enums";

const dietaryPreferenceSchema = z.object({
  type: z.string().trim().min(2).max(40),
  value: z.string().trim().min(1).max(80)
});

export const upsertProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  dateOfBirth: z.string().datetime().optional(),
  sex: z.nativeEnum(Sex).optional(),
  heightCm: z.number().positive().optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  activityLevel: z.nativeEnum(ActivityLevel).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  onboardingDone: z.boolean().optional(),
  preferences: z.array(dietaryPreferenceSchema).max(25).optional()
});

export const goalSchema = z.object({
  goalType: z.nativeEnum(GoalType)
});
