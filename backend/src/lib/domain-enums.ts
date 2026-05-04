export const Sex = {
  male: "male",
  female: "female",
  other: "other",
  undisclosed: "undisclosed"
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export const GoalType = {
  lose: "lose",
  maintain: "maintain",
  gain: "gain"
} as const;

export type GoalType = (typeof GoalType)[keyof typeof GoalType];

export const ActivityLevel = {
  sedentary: "sedentary",
  light: "light",
  moderate: "moderate",
  active: "active",
  athlete: "athlete"
} as const;

export type ActivityLevel = (typeof ActivityLevel)[keyof typeof ActivityLevel];

export const MealType = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "snack"
} as const;

export type MealType = (typeof MealType)[keyof typeof MealType];

export const ContentType = {
  recipe: "recipe",
  workout: "workout",
  challenge: "challenge",
  article: "article",
  video: "video"
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ReminderType = {
  meal: "meal",
  weigh_in: "weigh_in",
  workout: "workout",
  hydration: "hydration",
  streak_nudge: "streak_nudge"
} as const;

export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];

export const SyncStatus = {
  pending: "pending",
  applied: "applied",
  failed: "failed"
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];
