import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Calculator, Clock3, Dumbbell, Footprints, HeartPulse, MapPinned, Plus, Route, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { createWorkoutEntry, getDashboard, getProfileSummary, listWorkouts } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const INTENSITY_MULTIPLIER = { Low: 0.88, Moderate: 1, High: 1.18 } as const;
type Intensity = keyof typeof INTENSITY_MULTIPLIER;
type WorkoutCategory = "cardio" | "strength" | "mobility" | "sport";
type Exercise = { name: string; category: WorkoutCategory; defaultMinutes: number; met: number; supportsDistance?: boolean };

const EXERCISES: Exercise[] = [
  { name: "Walking", category: "cardio", defaultMinutes: 30, met: 3.5, supportsDistance: true },
  { name: "Brisk walk", category: "cardio", defaultMinutes: 30, met: 4.3, supportsDistance: true },
  { name: "Incline walk", category: "cardio", defaultMinutes: 25, met: 5.3, supportsDistance: true },
  { name: "Jogging", category: "cardio", defaultMinutes: 30, met: 7, supportsDistance: true },
  { name: "Running", category: "cardio", defaultMinutes: 35, met: 9.8, supportsDistance: true },
  { name: "Tempo run", category: "cardio", defaultMinutes: 35, met: 9.8, supportsDistance: true },
  { name: "Cycling", category: "cardio", defaultMinutes: 40, met: 7.5 },
  { name: "Rowing machine", category: "cardio", defaultMinutes: 25, met: 7 },
  { name: "Swimming", category: "cardio", defaultMinutes: 30, met: 6 },
  { name: "Elliptical", category: "cardio", defaultMinutes: 30, met: 5 },
  { name: "Stair climber", category: "cardio", defaultMinutes: 25, met: 8.8 },
  { name: "HIIT intervals", category: "cardio", defaultMinutes: 20, met: 8 },
  { name: "Strength circuit", category: "strength", defaultMinutes: 45, met: 5.5 },
  { name: "Weight lifting", category: "strength", defaultMinutes: 40, met: 4.5 },
  { name: "Bodyweight training", category: "strength", defaultMinutes: 30, met: 3.8 },
  { name: "Kettlebell workout", category: "strength", defaultMinutes: 25, met: 6 },
  { name: "CrossFit-style circuit", category: "strength", defaultMinutes: 35, met: 8 },
  { name: "Mobility and core", category: "mobility", defaultMinutes: 20, met: 2.8 },
  { name: "Yoga flow", category: "mobility", defaultMinutes: 30, met: 3 },
  { name: "Pilates", category: "mobility", defaultMinutes: 35, met: 3.5 },
  { name: "Stretching", category: "mobility", defaultMinutes: 20, met: 2.3 },
  { name: "Football", category: "sport", defaultMinutes: 60, met: 7 },
  { name: "Tennis", category: "sport", defaultMinutes: 45, met: 7.3 },
  { name: "Basketball", category: "sport", defaultMinutes: 45, met: 6.5 },
  { name: "Badminton", category: "sport", defaultMinutes: 45, met: 5.5 },
];

const CATEGORY_LABELS: Record<WorkoutCategory, string> = { cardio: "Cardio", strength: "Strength", mobility: "Mobility", sport: "Sport" };
const CATEGORY_ICONS = { cardio: HeartPulse, strength: Dumbbell, mobility: Sparkles, sport: Bike } as const;

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${dateKey}T12:00:00`));
}

type CalorieBreakdown = { calories: number; met: number; speedKmh?: number; method: string };

function caloriesFromMet(met: number, weightKg: number, minutes: number) {
  return (met * 3.5 * weightKg * minutes) / 200;
}

function metForWalkRun(exerciseName: string, speedKmh: number) {
  const isWalk = exerciseName.toLowerCase().includes("walk");
  if (isWalk) {
    if (speedKmh < 4) return 2.8;
    if (speedKmh < 5.6) return 3.8;
    if (speedKmh < 6.5) return 4.8;
    return 5.8;
  }
  if (speedKmh < 8) return 7;
  if (speedKmh < 9.7) return 9;
  if (speedKmh < 11.3) return 10.5;
  if (speedKmh < 12.9) return 11.8;
  return 12.8;
}

function calculateCalories(input: { exercise: Exercise; weightKg: number; minutes: number; intensity: Intensity; steps: number; distanceKm: number }): CalorieBreakdown {
  const safeMinutes = Math.max(1, input.minutes || 1);
  const safeWeight = Math.max(35, input.weightKg || 70);
  const speedKmh = input.distanceKm > 0 ? input.distanceKm / (safeMinutes / 60) : undefined;
  const useDistanceMethod = input.exercise.supportsDistance && input.distanceKm > 0 && speedKmh !== undefined;
  const met = useDistanceMethod ? metForWalkRun(input.exercise.name, speedKmh) : input.exercise.met;
  const durationCalories = caloriesFromMet(met, safeWeight, safeMinutes);
  const stepCalories = input.exercise.category === "cardio" && !useDistanceMethod && input.steps > 0 ? input.steps * 0.00075 * safeWeight * 0.53 : 0;
  const total = (durationCalories + stepCalories) * INTENSITY_MULTIPLIER[input.intensity];
  return {
    calories: Math.max(1, Math.round(total)),
    met,
    speedKmh,
    method: useDistanceMethod ? "Distance + time pace estimate" : input.steps > 0 && input.exercise.category === "cardio" ? "MET duration + step estimate" : "MET duration estimate",
  };
}

function Modal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 px-3 pb-3 pt-16 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-[30px] border border-border/80 bg-background shadow-[0_24px_70px_hsl(var(--foreground)/0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 bg-card/80 px-4 py-4 sm:px-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/60">{eyebrow}</p><h2 className="display-font mt-1 text-xl font-bold text-foreground">{title}</h2></div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground" aria-label="Close modal"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[calc(86vh-82px)] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

function detailFromNotes(notes?: string) {
  if (!notes) return null;
  const steps = notes.match(/Steps: ([\d,]+)/)?.[1];
  const intensity = notes.match(/Intensity: ([A-Za-z]+)/)?.[1];
  return [intensity, steps ? `${steps} steps` : null].filter(Boolean).join(" • ");
}


type TrackerPoint = { latitude: number; longitude: number; accuracy: number; timestamp: number };

function distanceBetweenPointsKm(from: TrackerPoint, to: TrackerPoint) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Activity() {
  const { currentDate, uiMode, workoutPresets, isBackendReady } = useApp();
  const queryClient = useQueryClient();
  const [selectedExerciseName, setSelectedExerciseName] = useState(EXERCISES[0].name);
  const [customTitle, setCustomTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(EXERCISES[0].defaultMinutes);
  const [intensity, setIntensity] = useState<Intensity>("Moderate");
  const [steps, setSteps] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [activeModal, setActiveModal] = useState<"custom" | "library" | "routes" | null>(null);
  const [isTrackingRoute, setIsTrackingRoute] = useState(false);
  const [trackedDistanceKm, setTrackedDistanceKm] = useState(0);
  const [trackedElapsedSeconds, setTrackedElapsedSeconds] = useState(0);
  const [trackerPointCount, setTrackerPointCount] = useState(0);
  const [trackerAccuracy, setTrackerAccuracy] = useState<number | null>(null);
  const [trackerMessage, setTrackerMessage] = useState("Press start, allow location access, then keep the app open while you walk or run.");
  const lastTrackerPointRef = useRef<TrackerPoint | null>(null);
  const trackerWatchIdRef = useRef<number | null>(null);
  const trackerStartedAtRef = useRef<number | null>(null);

  const dashboardQuery = useQuery({ queryKey: ["dashboard", currentDate], queryFn: () => getDashboard(currentDate), enabled: isBackendReady });
  const workoutsQuery = useQuery({ queryKey: ["workouts"], queryFn: listWorkouts, enabled: isBackendReady });
  const profileQuery = useQuery({ queryKey: ["profile-summary"], queryFn: getProfileSummary, enabled: isBackendReady });

  const selectedExercise = useMemo(() => EXERCISES.find((exercise) => exercise.name === selectedExerciseName) ?? EXERCISES[0], [selectedExerciseName]);
  const userWeightKg = profileQuery.data?.profile.currentWeight ?? 70;
  const parsedSteps = selectedExercise.category === "cardio" ? Number(steps.replace(/,/g, "")) || 0 : 0;
  const parsedDistanceKm = selectedExercise.supportsDistance ? Number(distanceKm) || 0 : 0;
  const estimate = calculateCalories({ exercise: selectedExercise, weightKg: userWeightKg, minutes: durationMinutes, intensity, steps: parsedSteps, distanceKm: parsedDistanceKm });
  const estimatedCalories = estimate.calories;
  const dashboard = dashboardQuery.data;

  const workoutMutation = useMutation({
    mutationFn: (input: { title: string; caloriesBurned: number; durationMinutes: number; notes?: string }) => createWorkoutEntry({ ...input, performedAt: new Date(`${currentDate}T12:00:00`).toISOString() }),
    onSuccess: (workout) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", currentDate] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success(`${workout.title} added.`);
      setActiveModal(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not log that workout."),
  });

  const logWorkout = () => {
    if (!isBackendReady) {
      toast.error("Workout logging is still getting ready. Try again in a moment.");
      return;
    }
    const title = customTitle.trim() || selectedExercise.name;
    const notes = [
      `Category: ${CATEGORY_LABELS[selectedExercise.category]}`,
      `Intensity: ${intensity}`,
      parsedDistanceKm > 0 ? `Distance: ${parsedDistanceKm.toFixed(2)} km` : null,
      estimate.speedKmh ? `Speed: ${estimate.speedKmh.toFixed(1)} km/h` : null,
      selectedExercise.category === "cardio" && parsedSteps > 0 ? `Steps: ${parsedSteps.toLocaleString("en-GB")}` : null,
      `Method: ${estimate.method}`,
      `MET: ${estimate.met.toFixed(1)}`,
      `Estimated with ${userWeightKg} kg body weight`,
    ].filter(Boolean).join(" | ");
    workoutMutation.mutate({ title, durationMinutes, caloriesBurned: estimatedCalories, notes });
  };

  const selectExercise = (exercise: Exercise) => {
    setSelectedExerciseName(exercise.name);
    setDurationMinutes(exercise.defaultMinutes);
    if (exercise.category !== "cardio") setSteps("");
    if (!exercise.supportsDistance) setDistanceKm("");
    setActiveModal("custom");
  };

  const stopRouteTracking = () => {
    if (trackerWatchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(trackerWatchIdRef.current);
      trackerWatchIdRef.current = null;
    }
    setIsTrackingRoute(false);
    trackerStartedAtRef.current = null;
  };

  const startRouteTracking = () => {
    if (!("geolocation" in navigator)) {
      setTrackerMessage("Location tracking is not available on this device or browser.");
      toast.error("Location tracking is not available on this device.");
      return;
    }

    setTrackedDistanceKm(0);
    setTrackedElapsedSeconds(0);
    setTrackerPointCount(0);
    setTrackerAccuracy(null);
    setTrackerMessage("Waiting for a good GPS signal...");
    lastTrackerPointRef.current = null;
    trackerStartedAtRef.current = Date.now();
    setIsTrackingRoute(true);

    trackerWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point: TrackerPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setTrackerAccuracy(point.accuracy);
        setTrackerPointCount((count) => count + 1);

        const previousPoint = lastTrackerPointRef.current;
        lastTrackerPointRef.current = point;

        if (!previousPoint) {
          setTrackerMessage("Tracking started. Keep the app open while you move.");
          return;
        }

        const secondsSinceLastPoint = Math.max(1, (point.timestamp - previousPoint.timestamp) / 1000);
        const segmentKm = distanceBetweenPointsKm(previousPoint, point);
        const segmentSpeedKmh = segmentKm / (secondsSinceLastPoint / 3600);

        if (point.accuracy > 75 || segmentKm < 0.003 || segmentSpeedKmh > 25) {
          setTrackerMessage(point.accuracy > 75 ? "GPS signal is weak. Distance will update when accuracy improves." : "Tracking... filtering small GPS jumps.");
          return;
        }

        setTrackedDistanceKm((distance) => distance + segmentKm);
        setTrackerMessage("Tracking your route.");
      },
      (error) => {
        setTrackerMessage(error.message || "Could not access your location.");
        toast.error(error.message || "Could not access your location.");
        stopRouteTracking();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  };

  useEffect(() => {
    if (!isTrackingRoute) return;
    const intervalId = window.setInterval(() => {
      if (trackerStartedAtRef.current) {
        setTrackedElapsedSeconds(Math.floor((Date.now() - trackerStartedAtRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isTrackingRoute]);

  useEffect(() => () => stopRouteTracking(), []);

  const resetRouteTracker = () => {
    stopRouteTracking();
    setTrackedDistanceKm(0);
    setTrackedElapsedSeconds(0);
    setTrackerPointCount(0);
    setTrackerAccuracy(null);
    lastTrackerPointRef.current = null;
    setTrackerMessage("Press start, allow location access, then keep the app open while you walk or run.");
  };

  const trackedDurationMinutes = Math.max(1, Math.round(trackedElapsedSeconds / 60));
  const trackedSpeedKmh = trackedElapsedSeconds > 0 ? trackedDistanceKm / (trackedElapsedSeconds / 3600) : 0;
  const trackedExercise = trackedSpeedKmh >= 7 ? EXERCISES.find((exercise) => exercise.name === "Running")! : EXERCISES.find((exercise) => exercise.name === "Walking")!;
  const trackedCalories = calculateCalories({ exercise: trackedExercise, weightKg: userWeightKg, minutes: trackedDurationMinutes, intensity: "Moderate", steps: 0, distanceKm: trackedDistanceKm }).calories;

  const logTrackedRoute = () => {
    if (!isBackendReady) {
      toast.error("Workout logging is still getting ready. Try again in a moment.");
      return;
    }
    if (trackedDistanceKm < 0.01 || trackedElapsedSeconds < 10) {
      toast.error("Track a little more distance before saving this route.");
      return;
    }
    stopRouteTracking();
    workoutMutation.mutate({
      title: trackedSpeedKmh >= 7 ? "Tracked run" : "Tracked walk",
      durationMinutes: trackedDurationMinutes,
      caloriesBurned: trackedCalories,
      notes: `Distance: ${trackedDistanceKm.toFixed(2)} km | Speed: ${trackedSpeedKmh.toFixed(1)} km/h | GPS route tracker | Points: ${trackerPointCount}`,
    });
  };

  const routeTracker = (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-primary/15 bg-primary/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><MapPinned className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-bold text-foreground">Live route tracker</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Uses your phone location to estimate how far you have walked or ran.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-surface-elevated/45 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Distance</p><p className="display-font mt-1 text-3xl font-bold text-foreground">{trackedDistanceKm.toFixed(2)}</p><p className="text-xs text-muted-foreground">km</p></div>
        <div className="rounded-[24px] bg-surface-elevated/45 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Time</p><p className="display-font mt-1 text-3xl font-bold text-foreground">{formatDuration(trackedElapsedSeconds)}</p><p className="text-xs text-muted-foreground">moving timer</p></div>
        <div className="rounded-[24px] bg-surface-elevated/45 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Pace</p><p className="display-font mt-1 text-3xl font-bold text-foreground">{trackedSpeedKmh > 0 ? trackedSpeedKmh.toFixed(1) : "--"}</p><p className="text-xs text-muted-foreground">km/h</p></div>
        <div className="rounded-[24px] bg-surface-elevated/45 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Burn</p><p className="display-font mt-1 text-3xl font-bold text-foreground">{trackedDistanceKm > 0 ? trackedCalories : 0}</p><p className="text-xs text-muted-foreground">estimated kcal</p></div>
      </div>

      <div className="rounded-[24px] border border-border/80 bg-card/90 p-4">
        <p className="text-sm font-semibold text-foreground">{isTrackingRoute ? "Tracking is active" : "Tracking is stopped"}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{trackerMessage}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1.5">GPS points: {trackerPointCount}</span>
          <span className="rounded-full bg-secondary px-3 py-1.5">Accuracy: {trackerAccuracy ? `±${Math.round(trackerAccuracy)}m` : "waiting"}</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {isTrackingRoute ? <button onClick={stopRouteTracking} className="rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background">Stop</button> : <button onClick={startRouteTracking} className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Start tracking</button>}
        <button onClick={resetRouteTracker} className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">Reset</button>
        <button onClick={logTrackedRoute} disabled={workoutMutation.isPending || trackedDistanceKm < 0.01} className="rounded-2xl bg-primary/90 px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50">Save workout</button>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">For best results, allow precise location, start outdoors, and keep the app open while tracking. Very weak GPS points are ignored to reduce false distance jumps.</p>
    </div>
  );

  const builder = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-foreground">Exercise
          <select value={selectedExerciseName} onChange={(event) => { const next = EXERCISES.find((exercise) => exercise.name === event.target.value) ?? EXERCISES[0]; setSelectedExerciseName(next.name); setDurationMinutes(next.defaultMinutes); if (next.category !== "cardio") setSteps(""); if (!next.supportsDistance) setDistanceKm(""); }} className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <optgroup key={category} label={label}>{EXERCISES.filter((exercise) => exercise.category === category).map((exercise) => <option key={exercise.name} value={exercise.name}>{exercise.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold text-foreground">Workout name optional
          <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="e.g. Push day, morning 5K" className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-semibold text-foreground">Time minutes
          <input type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value) || 1))} className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25" />
        </label>
        <label className="space-y-2 text-sm font-semibold text-foreground">Intensity
          <select value={intensity} onChange={(event) => setIntensity(event.target.value as Intensity)} className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"><option>Low</option><option>Moderate</option><option>High</option></select>
        </label>
        <label className="space-y-2 text-sm font-semibold text-foreground">Steps for cardio
          <input type="number" min="0" disabled={selectedExercise.category !== "cardio"} value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={selectedExercise.category === "cardio" ? "e.g. 6500" : "Cardio only"} className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50" />
        </label>
      </div>

      {selectedExercise.supportsDistance ? (
        <label className="block space-y-2 text-sm font-semibold text-foreground">Distance for walking / jogging / running
          <div className="relative"><input type="number" min="0" step="0.01" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} placeholder="e.g. 5.00" className="w-full rounded-2xl border border-border/80 bg-card px-3 py-3 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">km</span></div>
        </label>
      ) : null}

      <div className="rounded-[24px] border border-primary/15 bg-primary/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Estimated burn</p><p className="display-font mt-1 text-3xl font-bold text-foreground">{estimatedCalories} kcal</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{estimate.method}{estimate.speedKmh ? ` • ${estimate.speedKmh.toFixed(1)} km/h` : ""} • MET {estimate.met.toFixed(1)} • {Math.round(userWeightKg)} kg profile weight.</p></div>
          <button onClick={logWorkout} disabled={workoutMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] transition-opacity disabled:opacity-60"><Plus className="h-4 w-4" /> Log workout</button>
        </div>
      </div>
    </div>
  );

  return (
    <AppPage>
      <PageHeader eyebrow="Activity" title="Activity" description={formatDateLabel(currentDate)} action={<span className="app-chip text-primary">{uiMode === "advanced" ? "Advanced" : "Simple"}</span>} />

      {dashboard ? (
        <SectionCard variant="hero" eyebrow="Today" title={`${Math.round(dashboard.caloriesBurned)} kcal burned`} description={`${dashboard.workoutCount} workouts`}>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[18px] bg-card/60 px-3 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Workouts</p><p className="display-font mt-1 text-xl font-bold text-foreground">{dashboard.workoutCount}</p></div>
            <div className="rounded-[18px] bg-card/60 px-3 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Food</p><p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.daily.calories)}</p></div>
            <div className="rounded-[18px] bg-card/60 px-3 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">Net</p><p className="display-font mt-1 text-xl font-bold text-foreground">{Math.round(dashboard.netCalories)}</p></div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard eyebrow="Log activity" title="Workout tools" description="Open detailed forms only when needed." bodyClassName="grid gap-2 sm:grid-cols-3">
        <button onClick={() => setActiveModal("custom")} className="rounded-[22px] border border-primary/20 bg-primary/[0.08] p-4 text-left shadow-[var(--shadow-card)]"><Calculator className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold text-foreground">Custom workout</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Time, distance, steps and intensity.</p></button>
        <button onClick={() => setActiveModal("library")} className="rounded-[22px] border border-border/80 bg-card/90 p-4 text-left shadow-[var(--shadow-card)]"><Dumbbell className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold text-foreground">Exercise library</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose from {EXERCISES.length} exercises.</p></button>
        <button onClick={() => setActiveModal("routes")} className="rounded-[22px] border border-border/80 bg-card/90 p-4 text-left shadow-[var(--shadow-card)]"><Route className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold text-foreground">Routes</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Track walk or run distance.</p></button>
      </SectionCard>

      <SectionCard eyebrow="Quick log" title="Presets" bodyClassName="grid gap-3 sm:grid-cols-2">
        {workoutPresets.slice(0, uiMode === "advanced" ? workoutPresets.length : 4).map((preset) => (
          <button key={preset.type} onClick={() => workoutMutation.mutate({ title: preset.type, caloriesBurned: preset.caloriesBurned, durationMinutes: preset.durationMinutes, notes: `Intensity: ${preset.intensity} | Preset workout` })} className="rounded-[22px] border border-border/80 bg-card/90 p-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-surface-elevated/75">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-foreground">{preset.type}</span><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></div></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-secondary px-3 py-1.5">{preset.durationMinutes} min</span><span className="rounded-full bg-secondary px-3 py-1.5">{preset.caloriesBurned} kcal</span>{uiMode === "advanced" ? <span className="rounded-full bg-secondary px-3 py-1.5">{preset.intensity}</span> : null}</div>
          </button>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Logged" title="Recent">
        <div className="space-y-2.5">
          {(workoutsQuery.data ?? []).length === 0 ? <div className="rounded-[22px] border border-dashed border-primary/20 bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">Log a workout above and it will appear here.</div> : (workoutsQuery.data ?? []).slice(0, 8).map((workout) => (
            <div key={workout.id} className="flex items-center gap-3 rounded-[18px] bg-surface-elevated/35 px-3.5 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">{workout.notes?.includes("Steps:") ? <Footprints className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{workout.title}</p><p className="mt-1 text-xs text-muted-foreground">{workout.durationMinutes} min / {Math.round(workout.caloriesBurned)} kcal{detailFromNotes(workout.notes) ? ` • ${detailFromNotes(workout.notes)}` : ""}</p></div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(workout.performedAt))}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {activeModal === "custom" ? <Modal eyebrow="Custom log" title="Build workout" onClose={() => setActiveModal(null)}>{builder}</Modal> : null}

      {activeModal === "library" ? (
        <Modal eyebrow="Exercise library" title="Choose an exercise" onClose={() => setActiveModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXERCISES.map((exercise) => { const Icon = CATEGORY_ICONS[exercise.category]; return (
              <button key={exercise.name} onClick={() => selectExercise(exercise)} className="rounded-[22px] border border-border/80 bg-card/90 p-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-surface-elevated/75">
                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{exercise.name}</p><p className="mt-1 text-xs text-muted-foreground">{CATEGORY_LABELS[exercise.category]} • {exercise.defaultMinutes} min • MET {exercise.met}{exercise.supportsDistance ? " • distance" : ""}</p></div><Plus className="h-4 w-4 text-primary" /></div>
              </button>
            ); })}
          </div>
        </Modal>
      ) : null}

      {activeModal === "routes" ? (
        <Modal eyebrow="GPS tracker" title="Routes" onClose={() => setActiveModal(null)}>
          {routeTracker}
        </Modal>
      ) : null}
    </AppPage>
  );
}
