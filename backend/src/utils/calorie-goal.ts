import { ActivityLevel, GoalType, Sex, type ActivityLevel as ActivityLevelValue, type GoalType as GoalTypeValue, type Sex as SexValue } from "../lib/domain-enums";

type GoalInput = {
  sex: SexValue;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevelValue;
  goalType: GoalTypeValue;
};

const activityMultipliers: Record<ActivityLevelValue, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9
};

const goalAdjustments: Record<GoalTypeValue, number> = {
  lose: -450,
  maintain: 0,
  gain: 300
};

export function calculateCalorieGoal(input: GoalInput) {
  const { sex, age, heightCm, weightKg, activityLevel, goalType } = input;
  const baseBmr =
    sex === "female"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

  const tdee = baseBmr * activityMultipliers[activityLevel];
  const dailyCalories = Math.max(1200, Math.round(tdee + goalAdjustments[goalType]));
  const proteinGrams = Math.round(weightKg * (goalType === "gain" ? 2.1 : 1.8));
  const fatsGrams = Math.round((dailyCalories * 0.28) / 9);
  const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatsGrams * 9) / 4);
  const fibreGrams = sex === "female" ? 25 : 30;

  return {
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    fibreGrams
  };
}
