import { beforeEach, describe, expect, it } from "vitest";
import {
  createManualSavedFood,
  readManualSavedFoods,
  removeManualSavedFoodById,
  upsertManualSavedFood,
  writeManualSavedFoods,
} from "./manual-food-logs";

describe("manual saved foods", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores validated recent manual foods in session storage only", () => {
    const food = createManualSavedFood({
      foodName: "Lentil soup",
      amount: "1 bowl",
      grams: 320,
      calories: 280,
      protein: 18,
      carbs: 34,
      fat: 7,
      fiber: 9,
    });

    writeManualSavedFoods([food]);

    expect(readManualSavedFoods()).toHaveLength(1);
    expect(window.localStorage.getItem("manualSavedFoods")).toBeNull();
    expect(window.sessionStorage.getItem("manualSavedFoods")).toContain("Lentil soup");
  });

  it("deduplicates saved foods and removes by id", () => {
    const first = createManualSavedFood({
      foodName: "Greek yoghurt",
      amount: "170g",
      grams: 170,
      calories: 140,
    });
    const duplicate = createManualSavedFood({
      foodName: " Greek   yoghurt ",
      amount: "170g",
      grams: 170,
      calories: 140,
    });

    const saved = upsertManualSavedFood(upsertManualSavedFood([], first), duplicate);

    expect(saved).toHaveLength(1);
    expect(removeManualSavedFoodById(saved, saved[0].id)).toEqual([]);
  });
});
