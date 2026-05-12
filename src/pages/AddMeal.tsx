import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, History, LoaderCircle, Plus, Search, SearchCode, Star, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { FOOD_DATABASE, Food, MealType, MEAL_LABELS, useApp } from "@/context/AppContext";
import { createMealLog, listFavouriteFoods, listRecentFoods, searchFoods, setFavouriteFood, type SearchFood } from "@/lib/api";
import {
  addManualFoodLog,
  createManualFoodLog,
  createManualSavedFood,
  hasManualFoodLogDuplicate,
  type ManualFoodLog,
  type ManualSavedFood,
  parseManualCalories,
  parseManualOptionalNumber,
  readManualFoodLogs,
  readManualSavedFoods,
  removeManualSavedFoodById,
  upsertManualSavedFood,
  writeManualFoodLogs,
  writeManualSavedFoods,
} from "@/lib/manual-food-logs";
import { cn } from "@/lib/utils";

const SEARCH_MIN_LENGTH = 2;

const mealOptions: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

const tabs = [
  { value: "recent", label: "Recent", icon: History },
  { value: "favourites", label: "Saved", icon: Heart },
  { value: "all", label: "Starter", icon: Star },
] as const;

type Tab = (typeof tabs)[number]["value"];

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

export default function AddMeal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentDate, rememberFoods, uiMode, isBackendReady } = useApp();
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [manualFoodName, setManualFoodName] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualGrams, setManualGrams] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualFiber, setManualFiber] = useState("");
  const [manualFoodLogs, setManualFoodLogs] = useState<ManualFoodLog[]>(() => readManualFoodLogs());
  const [manualSavedFoods, setManualSavedFoods] = useState<ManualSavedFood[]>(() => readManualSavedFoods());
  const manualFoodLogsRef = useRef(manualFoodLogs);
  const manualSavedFoodsRef = useRef(manualSavedFoods);
  const [selectedFood, setSelectedFood] = useState<SearchFood | null>(null);
  const [portion, setPortion] = useState([1]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(() => {
    const requestedMeal = searchParams.get("meal");
    return isMealType(requestedMeal) ? requestedMeal : getSmartMealType();
  });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const requestedMeal = searchParams.get("meal");
    if (isMealType(requestedMeal)) {
      setSelectedMeal(requestedMeal);
    }
  }, [searchParams]);

  useEffect(() => {
    manualFoodLogsRef.current = manualFoodLogs;
  }, [manualFoodLogs]);

  useEffect(() => {
    manualSavedFoodsRef.current = manualSavedFoods;
  }, [manualSavedFoods]);

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

  const liveSearchActive = deferredSearch.trim().length >= SEARCH_MIN_LENGTH;
  const results = liveSearchActive ? liveFoods : browsingFoods;
  const favouriteKeys = new Set(favouriteFoods.map(foodMatchKey));
  const canAddManualFood = manualFoodName.trim().length > 0;

  const saveManualFoodLog = (log: ManualFoodLog) => {
    const currentLogs = manualFoodLogsRef.current;
    const nextLogs = addManualFoodLog(currentLogs, log);
    manualFoodLogsRef.current = nextLogs;
    setManualFoodLogs(nextLogs);
    writeManualFoodLogs(nextLogs);
  };

  const saveManualSavedFood = (food: ManualSavedFood) => {
    const nextFoods = upsertManualSavedFood(manualSavedFoodsRef.current, food);
    manualSavedFoodsRef.current = nextFoods;
    setManualSavedFoods(nextFoods);
    writeManualSavedFoods(nextFoods);
  };

  const removeManualSavedFood = (food: ManualSavedFood) => {
    const nextFoods = removeManualSavedFoodById(manualSavedFoodsRef.current, food.id);
    manualSavedFoodsRef.current = nextFoods;
    setManualSavedFoods(nextFoods);
    writeManualSavedFoods(nextFoods);
    toast.success(`${food.foodName} removed from saved foods.`);
  };

  const handleManualEntrySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const foodName = manualFoodName.trim();

    if (!foodName) {
      return;
    }

    const { calories, isValid } = parseManualCalories(manualCalories);
    if (!isValid) {
      toast.error("Calories must be a positive number.");
      return;
    }

    const gramsResult = parseManualOptionalNumber(manualGrams);
    const proteinResult = parseManualOptionalNumber(manualProtein);
    const carbsResult = parseManualOptionalNumber(manualCarbs);
    const fatResult = parseManualOptionalNumber(manualFat);
    const fiberResult = parseManualOptionalNumber(manualFiber);

    if (!gramsResult.isValid || !proteinResult.isValid || !carbsResult.isValid || !fatResult.isValid || !fiberResult.isValid) {
      toast.error("Nutrition values must be positive numbers.");
      return;
    }

    const log = createManualFoodLog({
      foodName,
      amount: manualAmount.trim(),
      grams: gramsResult.value,
      calories,
      protein: uiMode === "advanced" ? proteinResult.value : null,
      carbs: uiMode === "advanced" ? carbsResult.value : null,
      fat: uiMode === "advanced" ? fatResult.value : null,
      fiber: uiMode === "advanced" ? fiberResult.value : null,
      meal: selectedMeal,
      date: currentDate,
    });

    if (hasManualFoodLogDuplicate(manualFoodLogsRef.current, log)) {
      toast.info(`${log.foodName} is already logged for ${MEAL_LABELS[log.meal]}. Use the saved + button to add another.`);
      return;
    }

    saveManualFoodLog(log);
    saveManualSavedFood(
      createManualSavedFood({
        foodName: log.foodName,
        amount: log.amount,
        grams: log.grams,
        calories: log.calories,
        protein: log.protein,
        carbs: log.carbs,
        fat: log.fat,
        fiber: log.fiber,
      }),
    );
    setManualFoodName("");
    setManualAmount("");
    setManualGrams("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualFiber("");
    toast.success(`${log.foodName} added to ${MEAL_LABELS[log.meal]}.`);
  };

  const handleManualRecentAdd = (food: ManualSavedFood) => {
    const nextLog = createManualFoodLog({
      foodName: food.foodName,
      amount: food.amount,
      grams: food.grams,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      meal: selectedMeal,
      date: currentDate,
    });

    saveManualFoodLog(nextLog);
    saveManualSavedFood(food);
    toast.success(`${nextLog.foodName} added to ${MEAL_LABELS[nextLog.meal]}.`);
  };

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

  return (
    <AppPage>
      <PageHeader
        eyebrow="Log"
        title="Add food"
        action={
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card/90 shadow-[var(--shadow-card)]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
        }
      />

      <SectionCard eyebrow="Meal" title={MEAL_LABELS[selectedMeal]}>
        <div className="grid grid-cols-4 gap-2">
          {mealOptions.map((meal) => (
            <button
              key={meal}
              onClick={() => setSelectedMeal(meal)}
              className={cn(
                "min-h-11 rounded-2xl border px-2 py-2 text-center text-xs font-semibold transition-all",
                selectedMeal === meal
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.45)]"
                  : "border-border/80 bg-card/80 text-foreground hover:bg-surface-elevated/80",
              )}
            >
              {MEAL_LABELS[meal]}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Search" title="Find food">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search foods or brands"
                className="h-12 border-border/80 bg-surface-elevated/80 pl-11"
              />
            </div>
            <button
              type="submit"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.55)]"
              aria-label="Search foods"
            >
              {searchQuery.isFetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SearchCode className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-semibold transition-colors",
                  tab === item.value ? "bg-primary text-primary-foreground shadow-[var(--shadow-button)]" : "bg-surface-elevated/70 text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </form>
      </SectionCard>

      <SectionCard eyebrow="Quick add" title="Manual entry" variant="soft">
        <form onSubmit={handleManualEntrySubmit} className="space-y-3">
          <Input
            value={manualFoodName}
            onChange={(event) => setManualFoodName(event.target.value)}
            placeholder="Food name"
            className="h-11 border-border/80 bg-card/75"
          />
          <div className="grid grid-cols-[76px_88px_minmax(0,1fr)] gap-2">
            <Input
              type="number"
              min="1"
              step="1"
              value={manualAmount}
              onChange={(event) => setManualAmount(event.target.value)}
              placeholder="Amount"
              className="h-11 border-border/80 bg-card/75 px-2"
            />
            <Input
              value={manualGrams}
              onChange={(event) => setManualGrams(event.target.value)}
              placeholder="Grams"
              inputMode="decimal"
              className="h-11 border-border/80 bg-card/75 px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Input
              value={manualCalories}
              onChange={(event) => setManualCalories(event.target.value)}
              placeholder="Calories"
              inputMode="decimal"
              className="h-11 border-border/80 bg-card/75 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          {uiMode === "advanced" ? (
            <div className="grid grid-cols-4 gap-2">
              <Input
                value={manualProtein}
                onChange={(event) => setManualProtein(event.target.value)}
                placeholder="Protein"
                inputMode="decimal"
                className="h-10 border-border/80 bg-card/75 px-2 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Input
                value={manualCarbs}
                onChange={(event) => setManualCarbs(event.target.value)}
                placeholder="Carbs"
                inputMode="decimal"
                className="h-10 border-border/80 bg-card/75 px-2 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Input
                value={manualFat}
                onChange={(event) => setManualFat(event.target.value)}
                placeholder="Fat"
                inputMode="decimal"
                className="h-10 border-border/80 bg-card/75 px-2 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Input
                value={manualFiber}
                onChange={(event) => setManualFiber(event.target.value)}
                placeholder="Fibre"
                inputMode="decimal"
                className="h-10 border-border/80 bg-card/75 px-2 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          ) : null}
          <button
            type="submit"
            disabled={!canAddManualFood}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Plus className="h-4 w-4" />
            Add food
          </button>
        </form>
      </SectionCard>

      {manualSavedFoods.length > 0 ? (
        <SectionCard
          eyebrow="Saved"
          title="Manual foods"
          action={<span className="text-[11px] font-semibold text-muted-foreground">{manualSavedFoods.length}/10 saved</span>}
        >
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {manualSavedFoods.map((log) => (
              <div
                key={log.id}
                className="flex min-w-[166px] items-center gap-2 rounded-2xl border border-border/80 bg-card/65 px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-card/90"
              >
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{log.foodName}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[log.amount || "Quick add", log.grams !== null ? `${Math.round(log.grams)}g` : null, log.calories !== null ? `${Math.round(log.calories)} kcal` : null]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-primary/70">Adds to {MEAL_LABELS[selectedMeal]}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleManualRecentAdd(log)}
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-button)]"
                    aria-label={`Add ${log.foodName} again`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeManualSavedFood(log)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${log.foodName} from saved manual foods`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
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
      >
        <div className="space-y-2.5">
          {searchQuery.isError ? (
            <div className="rounded-[22px] border border-destructive/25 bg-destructive/10 px-4 py-4 text-sm text-destructive">
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
                "w-full rounded-[22px] border p-3.5 text-left transition-all",
                selectedFood?.id === food.id ? "border-primary bg-primary/10" : "border-border/80 bg-surface-elevated/35 hover:bg-surface-elevated/55",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-semibold text-primary">
                  {food.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {food.servingSize} / {Math.round(food.calories)} kcal / {food.brand ?? food.sourceLabel}
                      </p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        favouriteMutation.mutate(food);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
                      aria-label={`Toggle favourite for ${food.name}`}
                    >
                      <Heart className={cn("h-4 w-4", favouriteKeys.has(foodMatchKey(food)) && "fill-primary text-primary")} />
                    </button>
                  </div>
                  <div className={cn("mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground", uiMode !== "advanced" && "hidden")}>
                    {uiMode === "advanced" ? <span className="rounded-full bg-protein/15 px-2.5 py-1 text-protein">{Math.round(food.protein)}g protein</span> : null}
                    {uiMode === "advanced" ? <span className="rounded-full bg-surface-elevated/80 px-2.5 py-1">{food.sourceLabel}</span> : null}
                  </div>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isBackendReady) {
                      toast.error("Food logging is still getting ready. Try again in a moment.");
                      return;
                    }
                    createMealMutation.mutate({ food, quantity: 1 });
                  }}
                  className="rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.55)]"
                  aria-label={`Quick add ${food.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {selectedFood ? (
        <div className="absolute inset-x-4 bottom-24 rounded-[28px] border border-border/80 bg-card/95 p-4 shadow-[0_34px_60px_-36px_rgb(0_0_0/0.72)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Portion</p>
              <h2 className="display-font mt-1 text-xl font-bold text-foreground">{selectedFood.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Adjust serving.</p>
            </div>
            <button
              onClick={() => setSelectedFood(null)}
              className="rounded-xl px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>

          <div className="mt-4 rounded-[22px] border border-border/70 bg-surface-elevated/55 p-4">
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
                toast.error("Food logging is still getting ready. Try again in a moment.");
                return;
              }

              createMealMutation.mutate({ food: selectedFood, quantity: portion[0] });
              setSelectedFood(null);
            }}
            disabled={createMealMutation.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary-soft)))] px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log food
          </button>
        </div>
      ) : null}
    </AppPage>
  );
}
