import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Heart, History, LoaderCircle, Plus, Search, SearchCode, Sparkles, Star, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { FOOD_DATABASE, Food, MealType, MEAL_LABELS, useApp } from "@/context/AppContext";
import { createMealLog, createRecipe, createRecipeMealLog, importFood, listFavouriteFoods, listRecentFoods, listRecipes, searchFoods, setFavouriteFood, type RecipeSummary, type SearchFood } from "@/lib/api";
import { cn } from "@/lib/utils";

const SEARCH_MIN_LENGTH = 2;

const mealOptions: Array<{ value: MealType; subtitle: string }> = [
  { value: "breakfast", subtitle: "Morning meals" },
  { value: "lunch", subtitle: "Midday reset" },
  { value: "dinner", subtitle: "Evening meal" },
  { value: "snack", subtitle: "Small top-up" },
];

const tabs = [
  { value: "recent", label: "Recent", icon: History },
  { value: "favourites", label: "Favourites", icon: Heart },
  { value: "all", label: "Starter foods", icon: Star },
] as const;

type Tab = (typeof tabs)[number]["value"];

type RecipeBuilderItem = {
  id: string;
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servingSize?: string;
};

type ManualFoodForm = {
  name: string;
  brand: string;
  servingSize: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

const emptyManualFoodForm: ManualFoodForm = {
  name: "",
  brand: "",
  servingSize: "1 serving",
  calories: "",
  protein: "0",
  carbs: "0",
  fat: "0",
  fiber: "0",
};

function foodMatchKey(food: Pick<Food, "name" | "brand">) {
  return `${food.name.trim().toLowerCase()}::${food.brand?.trim().toLowerCase() ?? ""}`;
}

function getSmartMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function isMealType(value: string | null): value is MealType {
  return value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack";
}

function decorateFallbackFood(food: Food): SearchFood {
  return {
    ...food,
    apiSource: "local",
    sourceLabel: "Starter foods",
  };
}

function toNumber(value: string, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export default function AddMeal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentDate, rememberFoods, uiMode, isBackendReady, backendError } = useApp();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [selectedFood, setSelectedFood] = useState<SearchFood | null>(null);
  const [portion, setPortion] = useState([1]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(() => {
    const requestedMeal = searchParams.get("meal");
    return isMealType(requestedMeal) ? requestedMeal : getSmartMealType();
  });
  const [manualFood, setManualFood] = useState<ManualFoodForm>(emptyManualFoodForm);
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [recipeServings, setRecipeServings] = useState("1");
  const [recipeItems, setRecipeItems] = useState<RecipeBuilderItem[]>([]);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const requestedMeal = searchParams.get("meal");
    if (isMealType(requestedMeal)) {
      setSelectedMeal(requestedMeal);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextSearch = deferredSearch.trim();

    if (nextSearch.length >= SEARCH_MIN_LENGTH) {
      setSubmittedSearch((current) => (current === nextSearch ? current : nextSearch));
      return;
    }

    if (!nextSearch) {
      setSubmittedSearch("");
    }
  }, [deferredSearch]);

  const recentFoodsQuery = useQuery({
    queryKey: ["recent-foods"],
    queryFn: listRecentFoods,
    enabled: isBackendReady,
  });

  const favouriteFoodsQuery = useQuery({
    queryKey: ["favourite-foods"],
    queryFn: listFavouriteFoods,
    enabled: isBackendReady,
  });

  const recipesQuery = useQuery({
    queryKey: ["recipes"],
    queryFn: listRecipes,
    enabled: isBackendReady,
  });

  const searchQuery = useQuery({
    queryKey: ["food-search", submittedSearch],
    queryFn: () => searchFoods(submittedSearch, 12),
    enabled: submittedSearch.trim().length >= SEARCH_MIN_LENGTH,
    staleTime: 300_000,
  });

  const createMealMutation = useMutation({
    mutationFn: (payload: { food: SearchFood; quantity: number }) =>
      createMealLog({
        date: currentDate,
        mealType: selectedMeal,
        food: payload.food,
        quantity: payload.quantity,
      }),
    onSuccess: (_result, variables) => {
      rememberFoods([variables.food]);
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      queryClient.invalidateQueries({ queryKey: ["recent-foods"] });
      toast.success(`${variables.food.name} logged to ${MEAL_LABELS[selectedMeal]}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not log this food.");
    },
  });

  const logRecipeMutation = useMutation({
    mutationFn: (payload: { recipeId: string; title: string; quantity: number }) =>
      createRecipeMealLog({
        date: currentDate,
        mealType: selectedMeal,
        recipeId: payload.recipeId,
        quantity: payload.quantity,
      }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      queryClient.invalidateQueries({ queryKey: ["recent-foods"] });
      toast.success(`${variables.title} logged to ${MEAL_LABELS[selectedMeal]}.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not log this recipe.");
    },
  });

  const favouriteMutation = useMutation({
    mutationFn: async (food: SearchFood) => {
      const favouriteIds = new Set((favouriteFoodsQuery.data ?? []).map((item) => item.id));
      const shouldAdd = !favouriteIds.has(food.id);
      await setFavouriteFood(food, shouldAdd);
      rememberFoods([food]);
      return { food, shouldAdd };
    },
    onSuccess: ({ food, shouldAdd }) => {
      queryClient.invalidateQueries({ queryKey: ["favourite-foods"] });
      toast.success(shouldAdd ? `${food.name} saved to favourites.` : `${food.name} removed from favourites.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update favourites.");
    },
  });

  const manualFoodMutation = useMutation({
    mutationFn: async (shouldLog: boolean) => {
      const createdFood = await importFood({
        name: manualFood.name.trim(),
        brand: manualFood.brand.trim() || undefined,
        servingSize: manualFood.servingSize.trim() || "1 serving",
        calories: toNumber(manualFood.calories),
        proteinGrams: toNumber(manualFood.protein),
        carbsGrams: toNumber(manualFood.carbs),
        fatGrams: toNumber(manualFood.fat),
        fibreGrams: toNumber(manualFood.fiber),
        sourceLabel: "Manual entry",
      });

      if (shouldLog) {
        await createMealLog({
          date: currentDate,
          mealType: selectedMeal,
          food: {
            ...createdFood,
            apiSource: "local",
            sourceLabel: "Manual entry",
          },
          quantity: 1,
        });
      }

      return { createdFood, shouldLog };
    },
    onSuccess: ({ createdFood, shouldLog }) => {
      rememberFoods([createdFood]);
      queryClient.invalidateQueries({ queryKey: ["recent-foods"] });
      queryClient.invalidateQueries({ queryKey: ["favourite-foods"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      setManualFood(emptyManualFoodForm);
      toast.success(shouldLog ? `${createdFood.name} saved and logged.` : `${createdFood.name} saved to your food database.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save the food.");
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: () =>
      createRecipe({
        title: recipeTitle.trim(),
        description: recipeDescription.trim() || undefined,
        servings: Math.max(1, Math.round(toNumber(recipeServings, 1))),
        ingredients: recipeItems,
      }),
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setRecipeTitle("");
      setRecipeDescription("");
      setRecipeServings("1");
      setRecipeItems([]);
      toast.success(`${recipe.title} saved as a recipe.`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create the recipe.");
    },
  });

  const favouriteFoods = useMemo(
    () =>
      (favouriteFoodsQuery.data ?? []).map((food) => ({
        ...food,
        apiSource: "local" as const,
        sourceLabel: "Favourites",
      })),
    [favouriteFoodsQuery.data],
  );

  const recentFoods = useMemo(
    () =>
      (recentFoodsQuery.data ?? []).map((food) => ({
        ...food,
        apiSource: "local" as const,
        sourceLabel: "Recent foods",
      })),
    [recentFoodsQuery.data],
  );

  const starterFoods = useMemo(() => FOOD_DATABASE.map(decorateFallbackFood), []);
  const liveFoods = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  useEffect(() => {
    if (liveFoods.length > 0) {
      rememberFoods(liveFoods);
    }
  }, [liveFoods, rememberFoods]);

  const browsingFoods = useMemo(() => {
    const baseFoods = tab === "favourites" ? favouriteFoods : tab === "recent" ? recentFoods : starterFoods;
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return baseFoods;
    }

    return baseFoods.filter((food) => {
      const sourceText = `${food.name} ${food.brand ?? ""} ${food.sourceLabel}`.toLowerCase();
      return sourceText.includes(query);
    });
  }, [deferredSearch, favouriteFoods, recentFoods, starterFoods, tab]);

  const recipeSearch = deferredSearch.trim().toLowerCase();
  const savedRecipes = useMemo(() => {
    const allRecipes = recipesQuery.data ?? [];
    if (!recipeSearch) {
      return allRecipes;
    }
    return allRecipes.filter((recipe) => {
      const haystack = `${recipe.title} ${recipe.description ?? ""} ${recipe.ingredients.map((item) => item.name).join(" ")}`.toLowerCase();
      return haystack.includes(recipeSearch);
    });
  }, [recipeSearch, recipesQuery.data]);

  const liveSearchActive = deferredSearch.trim().length >= SEARCH_MIN_LENGTH;
  const results = liveSearchActive ? liveFoods : browsingFoods;
  const favouriteKeys = new Set(favouriteFoods.map(foodMatchKey));

  const recipeTotals = useMemo(
    () =>
      recipeItems.reduce(
        (totals, item) => ({
          calories: totals.calories + item.calories * item.quantity,
          protein: totals.protein + item.protein * item.quantity,
          carbs: totals.carbs + item.carbs * item.quantity,
          fat: totals.fat + item.fat * item.quantity,
          fiber: totals.fiber + item.fiber * item.quantity,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
    [recipeItems],
  );

  const recipeCaloriesPerServing = recipeTotals.calories / Math.max(1, toNumber(recipeServings, 1));

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = search.trim();

    if (!nextSearch) {
      setSubmittedSearch("");
      return;
    }

    if (nextSearch.length < SEARCH_MIN_LENGTH) {
      toast.info(`Type at least ${SEARCH_MIN_LENGTH} characters before searching.`);
      return;
    }

    setSelectedFood(null);
    startTransition(() => setSubmittedSearch(nextSearch));
  };

  const addFoodToRecipe = (food: SearchFood) => {
    setRecipeItems((current) => {
      const existing = current.find((item) => item.id === food.id);
      if (existing) {
        return current.map((item) => (item.id === food.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [
        ...current,
        {
          id: food.id,
          name: food.name,
          quantity: 1,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          servingSize: food.servingSize,
        },
      ];
    });
    toast.success(`${food.name} added to the recipe builder.`);
  };

  const updateRecipeItemQuantity = (id: string, quantity: number) => {
    setRecipeItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: Math.max(0.25, quantity) } : item)),
    );
  };

  const removeRecipeItem = (id: string) => {
    setRecipeItems((current) => current.filter((item) => item.id !== id));
  };

  const canSubmitManualFood = manualFood.name.trim().length >= 2 && toNumber(manualFood.calories, -1) >= 0;
  const canCreateRecipe = recipeTitle.trim().length >= 2 && recipeItems.length > 0;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Add Food"
        title="Log foods, save custom foods, and build recipes"
        description="Search your foods, manually add new foods with calories, and create recipes that total themselves up."
        action={
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/85 bg-white/92 shadow-[0_18px_30px_-26px_rgba(22,30,43,0.16)]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
        }
      />

      <SectionCard eyebrow="Meal" title={MEAL_LABELS[selectedMeal]} description="Everything you add here goes into this meal.">
        <div className="grid grid-cols-2 gap-3">
          {mealOptions.map((meal) => (
            <button
              key={meal.value}
              onClick={() => setSelectedMeal(meal.value)}
              className={cn(
                "rounded-[22px] border px-4 py-3 text-left transition-all",
                selectedMeal === meal.value
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.45)]"
                  : "border-white/85 bg-white/88 text-foreground hover:bg-white",
              )}
            >
              <p className="text-sm font-semibold">{MEAL_LABELS[meal.value]}</p>
              <p className={cn("mt-1 text-xs", selectedMeal === meal.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {meal.subtitle}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Search"
        title="Recent first, database when needed"
        description="Browse your own repeats or run a live backend search for something new."
      >
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search foods or brands"
                className="h-12 rounded-2xl border-white/85 bg-white/95 pl-11"
              />
            </div>
            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.55)]"
            >
              {searchQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SearchCode className="h-4 w-4" />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {search.trim().length >= SEARCH_MIN_LENGTH
              ? "Searching your saved foods and the live food database."
              : `Type ${SEARCH_MIN_LENGTH} or more characters for live food search.`}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-xs font-semibold transition-colors",
                  tab === item.value ? "bg-foreground text-white" : "bg-secondary/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          {uiMode === "advanced" ? (
            <div className="rounded-[20px] border border-primary/10 bg-primary/[0.05] px-4 py-3 text-sm text-muted-foreground">
              Live search uses your backend and Open Food Facts together. You can also add search results straight into the recipe builder below.
            </div>
          ) : null}
        </form>
      </SectionCard>

      {!isBackendReady ? (
        <SectionCard eyebrow="Backend" title="Logging needs the backend" description={backendError ?? "The app could not reach the backend yet."}>
          <div className="rounded-[22px] bg-secondary/35 px-4 py-4 text-sm text-muted-foreground">
            You can still browse starter foods below, but logging, custom food saving, and recipes start working as soon as the backend is running.
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        eyebrow="Foods"
        title={
          searchQuery.isFetching
            ? "Searching..."
            : results.length === 0
              ? "No foods found"
              : liveSearchActive
                ? `${results.length} live matches`
                : `${results.length} quick picks`
        }
        description={liveSearchActive ? "Live results from your backend and open food data." : "Start with foods you use most often."}
      >
        <div className="space-y-3">
          {searchQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {searchQuery.error instanceof Error ? searchQuery.error.message : "Food search is unavailable right now."}
            </div>
          ) : null}

          {results.length === 0 && !searchQuery.isFetching ? (
            <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/25 px-4 py-5 text-sm text-muted-foreground">
              Try a broader search, or switch back to recent foods.
            </div>
          ) : null}

          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => {
                setSelectedFood(food);
                setPortion([1]);
              }}
              className={cn(
                "w-full rounded-[24px] border p-4 text-left transition-all",
                selectedFood?.id === food.id ? "border-primary bg-primary/[0.05]" : "border-white/85 bg-secondary/20 hover:bg-secondary/35",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-primary shadow-sm">
                  {Math.round(food.protein)}P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {food.servingSize} / {food.brand ?? food.sourceLabel}
                      </p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        favouriteMutation.mutate(food);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white"
                      aria-label={`Toggle favourite for ${food.name}`}
                    >
                      <Heart className={cn("h-4 w-4", favouriteKeys.has(foodMatchKey(food)) && "fill-primary text-primary")} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                    <span className="rounded-full bg-white px-2.5 py-1">{Math.round(food.calories)} kcal</span>
                    <span className="rounded-full bg-white px-2.5 py-1">{Math.round(food.protein)}g protein</span>
                    {uiMode === "advanced" ? <span className="rounded-full bg-white px-2.5 py-1">{food.sourceLabel}</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!isBackendReady) {
                          toast.error("Start the backend before logging food.");
                          return;
                        }
                        createMealMutation.mutate({ food, quantity: 1 });
                      }}
                      className="rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.55)]"
                      aria-label={`Quick add ${food.name}`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addFoodToRecipe(food);
                      }}
                      className="rounded-2xl border border-primary/15 bg-white px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      Add to recipe
                    </button>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Custom food"
        title="Add a food manually"
        description="Save a new food to your database with calories and macros, then optionally log it right away."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={manualFood.name} onChange={(event) => setManualFood((current) => ({ ...current, name: event.target.value }))} placeholder="Food name" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input value={manualFood.brand} onChange={(event) => setManualFood((current) => ({ ...current, brand: event.target.value }))} placeholder="Brand (optional)" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input value={manualFood.servingSize} onChange={(event) => setManualFood((current) => ({ ...current, servingSize: event.target.value }))} placeholder="Serving size" className="h-12 rounded-2xl border-white/85 bg-white/95 sm:col-span-2" />
          <Input type="number" min="0" step="1" value={manualFood.calories} onChange={(event) => setManualFood((current) => ({ ...current, calories: event.target.value }))} placeholder="Calories" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input type="number" min="0" step="0.1" value={manualFood.protein} onChange={(event) => setManualFood((current) => ({ ...current, protein: event.target.value }))} placeholder="Protein (g)" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input type="number" min="0" step="0.1" value={manualFood.carbs} onChange={(event) => setManualFood((current) => ({ ...current, carbs: event.target.value }))} placeholder="Carbs (g)" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input type="number" min="0" step="0.1" value={manualFood.fat} onChange={(event) => setManualFood((current) => ({ ...current, fat: event.target.value }))} placeholder="Fat (g)" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input type="number" min="0" step="0.1" value={manualFood.fiber} onChange={(event) => setManualFood((current) => ({ ...current, fiber: event.target.value }))} placeholder="Fibre (g)" className="h-12 rounded-2xl border-white/85 bg-white/95" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isBackendReady || !canSubmitManualFood || manualFoodMutation.isPending}
            onClick={() => manualFoodMutation.mutate(false)}
            className="rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save custom food
          </button>
          <button
            type="button"
            disabled={!isBackendReady || !canSubmitManualFood || manualFoodMutation.isPending}
            onClick={() => manualFoodMutation.mutate(true)}
            className="rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_36px_-24px_hsl(var(--primary)/0.75)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save and log to {MEAL_LABELS[selectedMeal]}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Recipe builder"
        title="Create a recipe from foods"
        description="Add foods from search results, set quantities, and save the total calories as a reusable recipe."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={recipeTitle} onChange={(event) => setRecipeTitle(event.target.value)} placeholder="Recipe title" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Input type="number" min="1" step="1" value={recipeServings} onChange={(event) => setRecipeServings(event.target.value)} placeholder="Servings" className="h-12 rounded-2xl border-white/85 bg-white/95" />
          <Textarea value={recipeDescription} onChange={(event) => setRecipeDescription(event.target.value)} placeholder="Description (optional)" className="min-h-[96px] rounded-2xl border-white/85 bg-white/95 sm:col-span-2" />
        </div>

        <div className="mt-4 rounded-[22px] border border-primary/10 bg-secondary/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Recipe totals</p>
              <p className="text-xs text-muted-foreground">{recipeItems.length} ingredient{recipeItems.length === 1 ? "" : "s"}</p>
            </div>
            <div className="text-right">
              <p className="display-font text-xl font-bold text-foreground">{Math.round(recipeTotals.calories)} kcal</p>
              <p className="text-xs text-muted-foreground">{Math.round(recipeCaloriesPerServing || 0)} kcal per serving</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipeTotals.protein)}g protein</span>
            <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipeTotals.carbs)}g carbs</span>
            <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipeTotals.fat)}g fat</span>
            <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipeTotals.fiber)}g fibre</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {recipeItems.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/25 px-4 py-5 text-sm text-muted-foreground">
              Search for foods above, then tap <span className="font-semibold text-foreground">Add to recipe</span> to build your recipe.
            </div>
          ) : null}

          {recipeItems.map((item) => (
            <div key={item.id} className="rounded-[22px] border border-white/85 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.servingSize ?? "1 serving"}</p>
                </div>
                <button type="button" onClick={() => removeRecipeItem(item.id)} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={item.quantity}
                  onChange={(event) => updateRecipeItemQuantity(item.id, toNumber(event.target.value, 1))}
                  className="h-11 max-w-[120px] rounded-2xl border-white/85 bg-white/95"
                />
                <div className="text-right text-xs text-muted-foreground">
                  <p>{Math.round(item.calories * item.quantity)} kcal</p>
                  <p>{Math.round(item.protein * item.quantity)}g protein</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={!isBackendReady || !canCreateRecipe || createRecipeMutation.isPending}
          onClick={() => createRecipeMutation.mutate()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_22px_36px_-24px_hsl(var(--primary)/0.75)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BookOpen className="h-4 w-4" />
          Save recipe
        </button>
      </SectionCard>

      <SectionCard
        eyebrow="Saved recipes"
        title={savedRecipes.length > 0 ? `${savedRecipes.length} recipes ready to log` : "No saved recipes yet"}
        description="Each recipe shows the foods inside it and the calories for one serving."
      >
        <div className="space-y-3">
          {recipesQuery.isError ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {recipesQuery.error instanceof Error ? recipesQuery.error.message : "Recipes are unavailable right now."}
            </div>
          ) : null}

          {savedRecipes.length === 0 && !recipesQuery.isFetching ? (
            <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/25 px-4 py-5 text-sm text-muted-foreground">
              Create your first recipe from the foods above.
            </div>
          ) : null}

          {savedRecipes.map((recipe: RecipeSummary) => (
            <div key={recipe.id} className="rounded-[24px] border border-white/85 bg-secondary/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{recipe.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{recipe.servingSize}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isBackendReady) {
                      toast.error("Start the backend before logging a recipe.");
                      return;
                    }
                    logRecipeMutation.mutate({ recipeId: recipe.id, title: recipe.title, quantity: 1 });
                  }}
                  className="rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.55)]"
                >
                  Log recipe
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipe.calories)} kcal</span>
                <span className="rounded-full bg-white px-2.5 py-1">{Math.round(recipe.protein)}g protein</span>
                <span className="rounded-full bg-white px-2.5 py-1">{recipe.ingredients.length} foods</span>
              </div>

              <div className="mt-3 rounded-[20px] bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Foods included</p>
                <ul className="mt-2 space-y-2 text-sm text-foreground">
                  {recipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id} className="flex items-center justify-between gap-3">
                      <span>{ingredient.rawText}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(ingredient.calories ?? 0)} kcal</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {selectedFood ? (
        <div className="absolute inset-x-4 bottom-24 rounded-[28px] border border-white/85 bg-background/96 p-4 shadow-[0_34px_60px_-36px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Portion</p>
              <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">{selectedFood.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Adjust the serving, then log it to {MEAL_LABELS[selectedMeal].toLowerCase()}.</p>
            </div>
            <button
              onClick={() => setSelectedFood(null)}
              className="rounded-xl px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>

          <div className="mt-4 rounded-[22px] bg-secondary/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Serving multiplier</span>
              <span className="display-font text-lg font-bold text-foreground">{portion[0].toFixed(2)}x</span>
            </div>
            <Slider value={portion} min={0.5} max={2.5} step={0.25} onValueChange={setPortion} className="mt-4" />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{Math.round(selectedFood.calories * portion[0])} kcal</span>
              <span>{Math.round(selectedFood.protein * portion[0])}g protein</span>
              <span>{Math.round(selectedFood.fiber * portion[0])}g fibre</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!isBackendReady) {
                toast.error("Start the backend before logging food.");
                return;
              }

              createMealMutation.mutate({ food: selectedFood, quantity: portion[0] });
              setSelectedFood(null);
            }}
            disabled={createMealMutation.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_22px_36px_-24px_hsl(var(--primary)/0.75)] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            Log to {MEAL_LABELS[selectedMeal]}
          </button>
        </div>
      ) : null}
    </AppPage>
  );
}
