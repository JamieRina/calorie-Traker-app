import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const defaultAppOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081"
] as const;

const defaults = {
  NODE_ENV: "development",
  PORT: "4000",
  APP_ORIGIN: defaultAppOrigins.join(","),
  LOCAL_BACKEND_MODE: "auto",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/caloriedb?schema=public",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "local-development-access-secret",
  JWT_REFRESH_SECRET: "local-development-refresh-secret",
  JWT_ACCESS_TTL: "15m",
  JWT_REFRESH_TTL: "30d",
  OPENAI_MODEL: "gpt-4.1-mini",
  USDA_BASE_URL: "https://api.nal.usda.gov/fdc/v1",
  OPEN_FOOD_FACTS_BASE_URL: "https://world.openfoodfacts.org",
  OPEN_FOOD_FACTS_USER_AGENT: "NutriTrackPro/0.1 (replace-with-your-email@example.com)",
  REMINDER_QUEUE_NAME: "reminders",
  LOG_LEVEL: "info"
} as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.string().default(defaults.APP_ORIGIN),
  LOCAL_BACKEND_MODE: z.enum(["auto", "force_local", "database"]).default("auto"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  USDA_API_KEY: z.string().optional(),
  USDA_BASE_URL: z.string().url().default("https://api.nal.usda.gov/fdc/v1"),
  OPEN_FOOD_FACTS_BASE_URL: z.string().default("https://world.openfoodfacts.org"),
  OPEN_FOOD_FACTS_USER_AGENT: z.string().min(1).default("NutriTrackPro/0.1 (replace-with-your-email@example.com)"),
  REMINDER_QUEUE_NAME: z.string().default("reminders"),
  LOG_LEVEL: z.string().default("info")
});

const parsedEnv = envSchema.parse({
  ...defaults,
  ...process.env
});

const appOrigins = parsedEnv.APP_ORIGIN
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const usdaApiKey = parsedEnv.USDA_API_KEY?.trim();

const unsafeProductionValues = [
  parsedEnv.DATABASE_URL === defaults.DATABASE_URL ? "DATABASE_URL" : null,
  parsedEnv.REDIS_URL === defaults.REDIS_URL ? "REDIS_URL" : null,
  parsedEnv.JWT_ACCESS_SECRET === defaults.JWT_ACCESS_SECRET ? "JWT_ACCESS_SECRET" : null,
  parsedEnv.JWT_REFRESH_SECRET === defaults.JWT_REFRESH_SECRET ? "JWT_REFRESH_SECRET" : null
].filter((value): value is string => Boolean(value));

if (parsedEnv.NODE_ENV === "production" && unsafeProductionValues.length > 0) {
  throw new Error(
    `Unsafe production environment configuration for: ${unsafeProductionValues.join(", ")}`
  );
}

export const env = {
  ...parsedEnv,
  USDA_API_KEY: usdaApiKey && usdaApiKey !== "YOUR_USDA_API_KEY_HERE" ? usdaApiKey : undefined,
  APP_ORIGINS: appOrigins,
  PRIMARY_APP_ORIGIN: appOrigins[0] ?? defaultAppOrigins[0]
};
