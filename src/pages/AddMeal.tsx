import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Heart, History, Plus, Search, Sparkles, WandSparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FOOD_DATABASE, Food, MealType, MEAL_LABELS, useApp } from "@/context/AppContext";

const mealOptions: Array<{ value: MealType; subtitle: string }> = [
  { value: "breakfast", subtitle: "Best for quick starts" },
  { value: "lunch", subtitle: "Fastest repeat meal slot" },
  { value: "dinner", subtitle: "Use this for full meals" },
  { value: "snack", subtitle: "Ideal for gap closers" },
];

const tabs = [
  { value: "all", label: "All foods", icon: Search },
  { value: "favourites", label: "Favourites", icon: Heart },
  { value: "recent", label: "Recent", icon: History },
] as const;

type Tab = (typeof tabs)[number]["value"];

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

export default function AddMeal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addMealLog, getFavouriteFoods, getRecentFoods, toggleFavourite, favouriteFoodIds } = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portion, setPortion] = useState([1]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(() => {
    const requestedMeal = searchParams.get("meal");
    return isMealType(requestedMeal) ? requestedMeal : getSmartMealType();
  });
  const deferredSearch = useDeferredValue(search);
  const recentFoods = getRecentFoods();
  const favouriteFoods = getFavouriteFoods();

  useEffect(() => {
    const requestedMeal = searchParams.get("meal");
    if (isMealType(requestedMeal)) {
      setSelectedMeal(requestedMeal);
    }
  }, [searchParams]);

  const filteredFoods = useMemo(() => {
    const baseFoods = tab === "favourites" ? favouriteFoods : tab === "recent" ? recentFoods : FOOD_DATABASE;
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return baseFoods;
    }

    return baseFoods.filter((food) => {
      const sourceText = `${food.brand ?? ""} ${food.source}`.toLowerCase();
      return food.name.toLowerCase().includes(query) || sourceText.includes(query);
    });
  }, [deferredSearch, favouriteFoods, recentFoods, tab]);

  const handleQuickAdd = (food: Food, quantity = 1) => {
    addMealLog({ food, quantity, mealType: selectedMeal });
    toast.success(`${food.name} logged to ${MEAL_LABELS[selectedMeal]}.`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden pb-28">
      <div className="px-5 pt-6 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/78 shadow-sm backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Fast logging</p>
            <h1 className="display-font text-2xl font-bold tracking-tight text-foreground">Add food in two taps</h1>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { title: "Search", detail: "Local foods and quick recents", icon: Search },
            { title: "Barcode", detail: "Open Food Facts fallback flow", icon: Camera },
            { title: "Recipe AI", detail: "Paste ingredients and review", icon: WandSparkles },
          ].map((action) => (
            <div key={action.title} className="rounded-[24px] border border-white/70 bg-card/82 p-3 shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <action.icon className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">{action.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {mealOptions.map((meal) => (
            <button
              key={meal.value}
              onClick={() => setSelectedMeal(meal.value)}
              className={cn(
                "min-w-[132px] rounded-[22px] border px-4 py-3 text-left transition-all",
                selectedMeal === meal.value
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_22px_36px_-28px_hsl(var(--primary)/0.85)]"
                  : "border-white/70 bg-card/82 text-foreground shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm",
              )}
            >
              <p className="text-sm font-semibold">{MEAL_LABELS[meal.value]}</p>
              <p className={cn("mt-1 text-xs", selectedMeal === meal.value ? "text-primary-foreground/80" : "text-muted-foreground")}>{meal.subtitle}</p>
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search foods, brands, or recipes"
            className="h-12 rounded-2xl border-white/70 bg-white/80 pl-11 shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)]"
          />
        </div>

        <div className="mt-4 flex gap-2 rounded-[22px] border border-white/70 bg-card/82 p-1.5 shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          {tabs.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-xs font-semibold transition-colors",
                tab === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Repeat meals</p>
            <p className="text-sm text-muted-foreground">Tap once to re-log your fastest wins.</p>
          </div>
          <span className="rounded-full bg-white/72 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            {recentFoods.length} saved recents
          </span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {recentFoods.slice(0, 6).map((food) => (
            <button
              key={food.id}
              onClick={() => handleQuickAdd(food, 1)}
              className="flex min-w-[170px] items-center justify-between rounded-[22px] border border-white/70 bg-white/80 px-4 py-3 text-left shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{food.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{Math.round(food.calories)} kcal  |  {Math.round(food.protein)}g protein</p>
              </div>
              <Plus className="h-4 w-4 text-primary" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-5">
        <div className="space-y-3 pb-36">
          {filteredFoods.map((food) => (
            <button
              key={food.id}
              onClick={() => {
                setSelectedFood(food);
                setPortion([1]);
              }}
              className={cn(
                "w-full rounded-[26px] border p-4 text-left transition-all",
                selectedFood?.id === food.id
                  ? "border-primary bg-primary/8 shadow-[0_22px_36px_-30px_hsl(var(--primary)/0.65)]"
                  : "border-white/70 bg-card/82 shadow-[0_18px_30px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-sm font-semibold text-primary">
                  {Math.round(food.protein)}P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{food.servingSize}  |  {food.brand ?? food.source}</p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavourite(food.id);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary"
                      aria-label={`Toggle favourite for ${food.name}`}
                    >
                      <Heart className={cn("h-4 w-4", favouriteFoodIds.includes(food.id) && "fill-primary text-primary")} />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2.5 py-1">{Math.round(food.calories)} kcal</span>
                    <span className="rounded-full bg-secondary px-2.5 py-1">{Math.round(food.protein)}g protein</span>
                    <span className="rounded-full bg-secondary px-2.5 py-1">{Math.round(food.fiber)}g fiber</span>
                  </div>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleQuickAdd(food, 1);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_30px_-24px_hsl(var(--primary)/0.8)] transition-transform active:scale-95"
                  aria-label={`Quick add ${food.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </button>
          ))}

          {filteredFoods.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-primary/25 bg-card/72 px-4 py-10 text-center text-sm text-muted-foreground">
              No foods matched this search. Try switching tabs or searching by a simpler keyword.
            </div>
          ) : null}
        </div>
      </div>

      {selectedFood ? (
        <div className="absolute inset-x-4 bottom-24 rounded-[28px] border border-white/80 bg-background/96 p-4 shadow-[0_34px_60px_-36px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/60">Portion step</p>
              <h2 className="display-font mt-1 text-xl font-bold tracking-tight text-foreground">{selectedFood.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Adjust serving size before logging to {MEAL_LABELS[selectedMeal].toLowerCase()}.</p>
            </div>
            <button
              onClick={() => setSelectedFood(null)}
              className="rounded-xl px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-secondary/75 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Serving multiplier</span>
              <span className="display-font text-lg font-bold text-foreground">{portion[0].toFixed(2)}x</span>
            </div>
            <Slider
              value={portion}
              min={0.5}
              max={2.5}
              step={0.25}
              onValueChange={setPortion}
              className="mt-4"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{Math.round(selectedFood.calories * portion[0])} kcal</span>
              <span>{Math.round(selectedFood.protein * portion[0])}g protein</span>
              <span>{Math.round(selectedFood.fiber * portion[0])}g fiber</span>
            </div>
          </div>

          <button
            onClick={() => {
              handleQuickAdd(selectedFood, portion[0]);
              setSelectedFood(null);
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_22px_36px_-24px_hsl(var(--primary)/0.8)] transition-transform active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4" />
            Log {selectedFood.name}
          </button>
        </div>
      ) : null}
    </div>
  );
}
