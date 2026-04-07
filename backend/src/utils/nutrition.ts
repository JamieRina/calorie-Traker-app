type NutritionLike = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number | null;
};

export function scaleNutrition(nutrition: NutritionLike, portionCount = 1) {
  return {
    calories: nutrition.calories * portionCount,
    proteinGrams: nutrition.proteinGrams * portionCount,
    carbsGrams: nutrition.carbsGrams * portionCount,
    fatGrams: nutrition.fatGrams * portionCount,
    fibreGrams: (nutrition.fibreGrams ?? 0) * portionCount
  };
}

export function rollupNutrition(items: Array<{
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number;
}>) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinGrams: acc.proteinGrams + item.proteinGrams,
      carbsGrams: acc.carbsGrams + item.carbsGrams,
      fatGrams: acc.fatGrams + item.fatGrams,
      fibreGrams: acc.fibreGrams + item.fibreGrams
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fibreGrams: 0
    }
  );
}
