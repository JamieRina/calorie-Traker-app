import { describe, expect, it } from "vitest";
import { calculateCalorieGoal } from "../src/utils/calorie-goal";

describe("calculateCalorieGoal", () => {
  it("returns sensible macro targets", () => {
    const result = calculateCalorieGoal({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 82,
      activityLevel: "moderate",
      goalType: "lose"
    });

    expect(result.dailyCalories).toBeGreaterThan(1200);
    expect(result.proteinGrams).toBeGreaterThan(100);
    expect(result.carbsGrams).toBeGreaterThan(0);
  });
});
