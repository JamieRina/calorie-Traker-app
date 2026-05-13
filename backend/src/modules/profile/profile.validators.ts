import { z } from "zod";
import { ActivityLevel, GoalType, Sex } from "../../lib/domain-enums";

const dietaryPreferenceSchema = z.object({
  type: z.string().trim().min(2).max(40),
  value: z.string().trim().min(1).max(80)
});

const dateOfBirthSchema = z.string().datetime().refine((value) => {
  const date = new Date(value);
  const age = (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Number.isFinite(age) && age >= 13 && age <= 120;
}, "Date of birth must produce an age between 13 and 120");

export const upsertProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
  sex: z.nativeEnum(Sex).optional(),
  heightCm: z.number().min(80).max(250).optional(),
  currentWeightKg: z.number().min(25).max(350).optional(),
  targetWeightKg: z.number().min(25).max(350).optional(),
  activityLevel: z.nativeEnum(ActivityLevel).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  onboardingDone: z.boolean().optional(),
  preferences: z.array(dietaryPreferenceSchema).max(25).optional()
});

export const goalSchema = z.object({
  goalType: z.nativeEnum(GoalType)
});
