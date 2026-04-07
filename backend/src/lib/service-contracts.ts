export type LocalTimestamp = string | Date;

export type NutritionFactRecord = {
  id: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fibreGrams: number | null;
  sugarGrams?: number | null;
  sodiumMg?: number | null;
  servingSize: number | null;
  servingUnit: string | null;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
};

export type FoodRecord = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  searchVector?: string | null;
  nutritionFactId: string;
  nutritionFact: NutritionFactRecord;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
  imageUrl?: string | null;
};

export type GoalRecord = {
  id: string;
  userId: string;
  goalType: string;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fibreGrams: number;
  weeklyWeightDelta: number | null;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
};

export type PreferenceRecord = {
  id: string;
  userId: string;
  type: string;
  value: string;
  createdAt: LocalTimestamp;
};

export type UserProfileRecord = {
  id: string;
  userId: string;
  dateOfBirth: LocalTimestamp | null;
  sex: string;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: string;
  timezone: string;
  locale: string;
  avatarUrl?: string | null;
  onboardingDone: boolean;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
};

export type ProfileResponseRecord = {
  id: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  isEmailVerified: boolean;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
  profile: UserProfileRecord | null;
  goal: GoalRecord | null;
  preferences: PreferenceRecord[];
};

export type WorkoutRecord = {
  id: string;
  userId: string;
  title: string;
  caloriesBurned: number | null;
  durationMin: number | null;
  performedAt: LocalTimestamp;
  notes: string | null;
  createdAt: LocalTimestamp;
};

export type ProgressRecord = {
  id: string;
  userId: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  mood: string | null;
  note: string | null;
  recordedAt: LocalTimestamp;
  createdAt: LocalTimestamp;
};

export type MealItemRecord = {
  id: string;
  displayName: string;
  portionCount: number;
  food: FoodRecord | null;
  recipe: { id: string; title: string } | null;
  createdAt?: LocalTimestamp;
  foodId?: string | null;
  recipeId?: string | null;
  nutritionFactId?: string;
};

export type MealRecord = {
  id: string;
  userId: string;
  consumedAt: LocalTimestamp;
  mealType: string;
  notes: string | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFibre: number;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
  items: MealItemRecord[];
};

export type FavouriteRecord = {
  id: string;
  userId: string;
  foodId: string | null;
  recipeId: string | null;
  createdAt: LocalTimestamp;
};

export type FavouriteListRecord = FavouriteRecord & {
  food: FoodRecord | null;
  recipe: { id: string; title: string } | null;
};

export type BrandedFoodRecord = {
  id: string;
  barcode: string;
  brandName: string;
  productName: string;
  nutritionFactId: string;
  nutritionFact: NutritionFactRecord;
  food: FoodRecord | null;
  source: string | null;
  createdAt: LocalTimestamp;
  updatedAt: LocalTimestamp;
};

export type DashboardResponseRecord = {
  date: string;
  daily: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  goal: GoalRecord | null;
  remainingCalories: number | null;
  caloriesBurned: number;
  netCalories: number;
  mealCount: number;
  workoutCount: number;
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  weeklyTrend: Array<{
    day: string;
    calories: number;
  }>;
  latestProgress: ProgressRecord[];
};
