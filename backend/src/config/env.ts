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
  OPEN_FOOD_FACTS_USER_AGENT: "BiteBalance/0.1 (support@example.com)",
  REMINDER_QUEUE_NAME: "reminders",
  LOG_LEVEL: "info",
  AUTH_REFRESH_COOKIE_NAME: "bb_refresh",
  PASSWORD_RESET_TTL_MINUTES: "30",
  OTP_EXPIRY_MINUTES: "10",
  OTP_RESEND_COOLDOWN_SECONDS: "60",
  OTP_MAX_RESENDS: "3",
  OTP_MAX_VERIFY_ATTEMPTS: "5"
} as const;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "") {
        return undefined;
      }

      if (["true", "1", "yes"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no"].includes(normalized)) {
        return false;
      }
    }

    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
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
  OPEN_FOOD_FACTS_BASE_URL: z.string().url().default("https://world.openfoodfacts.org"),
  OPEN_FOOD_FACTS_USER_AGENT: z.string().min(1).default("BiteBalance/0.1 (support@example.com)"),
  REMINDER_QUEUE_NAME: z.string().default("reminders"),
  LOG_LEVEL: z.string().default("info"),
  AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default(defaults.AUTH_REFRESH_COOKIE_NAME),
  AUTH_COOKIE_DOMAIN: z.preprocess(blankToUndefined, z.string().optional()),
  PASSWORD_RESET_BASE_URL: z.string().url().optional(),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().max(180).default(30),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().max(60).default(10),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(15).max(900).default(60),
  OTP_MAX_RESENDS: z.coerce.number().int().min(1).max(10).default(3),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  SMTP_PROVIDER: z.enum(["custom", "gmail", "outlook", "sendgrid", "mailgun", "ses"]).default("custom"),
  SMTP_SES_REGION: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_HOST: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  SMTP_SECURE: booleanFromEnv(false),
  SMTP_REQUIRE_TLS: booleanFromEnv(true),
  SMTP_USER: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_PASSWORD: z.preprocess(blankToUndefined, z.string().optional()),
  SMTP_FROM: z.preprocess(blankToUndefined, z.string().min(3).optional())
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
function getPresetSmtpHost() {
  if (parsedEnv.SMTP_HOST) {
    return parsedEnv.SMTP_HOST;
  }

  switch (parsedEnv.SMTP_PROVIDER) {
    case "gmail":
      return "smtp.gmail.com";
    case "outlook":
      return "smtp.office365.com";
    case "sendgrid":
      return "smtp.sendgrid.net";
    case "mailgun":
      return "smtp.mailgun.org";
    case "ses":
      return parsedEnv.SMTP_SES_REGION
        ? `email-smtp.${parsedEnv.SMTP_SES_REGION}.amazonaws.com`
        : undefined;
    case "custom":
      return parsedEnv.SMTP_HOST;
  }
}

function getPresetSmtpPort() {
  if (parsedEnv.SMTP_PORT) {
    return parsedEnv.SMTP_PORT;
  }

  switch (parsedEnv.SMTP_PROVIDER) {
    case "gmail":
      return 465;
    case "outlook":
    case "sendgrid":
    case "mailgun":
    case "ses":
      return 587;
    case "custom":
      return parsedEnv.SMTP_PORT;
  }
}

function getPresetSmtpSecure(port?: number) {
  return parsedEnv.SMTP_SECURE || port === 465 || (parsedEnv.SMTP_PROVIDER === "gmail" && !parsedEnv.SMTP_PORT);
}

const smtpHost = getPresetSmtpHost();
const smtpPort = getPresetSmtpPort();
const smtpSecure = getPresetSmtpSecure(smtpPort);
const hasSmtpConfig = Boolean(
  smtpHost &&
    smtpPort &&
    parsedEnv.SMTP_FROM &&
    parsedEnv.SMTP_USER &&
    parsedEnv.SMTP_PASSWORD
);

const unsafeProductionValues = [
  parsedEnv.DATABASE_URL === defaults.DATABASE_URL ? "DATABASE_URL" : null,
  parsedEnv.REDIS_URL === defaults.REDIS_URL ? "REDIS_URL" : null,
  parsedEnv.JWT_ACCESS_SECRET === defaults.JWT_ACCESS_SECRET ? "JWT_ACCESS_SECRET" : null,
  parsedEnv.JWT_REFRESH_SECRET === defaults.JWT_REFRESH_SECRET ? "JWT_REFRESH_SECRET" : null,
  parsedEnv.JWT_ACCESS_SECRET === parsedEnv.JWT_REFRESH_SECRET ? "JWT secrets must be different" : null,
  parsedEnv.LOCAL_BACKEND_MODE !== "database" ? "LOCAL_BACKEND_MODE" : null,
  !parsedEnv.PASSWORD_RESET_BASE_URL ? "PASSWORD_RESET_BASE_URL" : null,
  parsedEnv.PASSWORD_RESET_BASE_URL && !parsedEnv.PASSWORD_RESET_BASE_URL.startsWith("https://") ? "PASSWORD_RESET_BASE_URL must use HTTPS" : null,
  !hasSmtpConfig ? "SMTP provider, credentials, and sender" : null,
  appOrigins.some((origin) => !origin.startsWith("https://")) ? "APP_ORIGIN must use HTTPS" : null
].filter((value): value is string => Boolean(value));

if (parsedEnv.NODE_ENV === "production" && unsafeProductionValues.length > 0) {
  throw new Error(
    `Unsafe production environment configuration for: ${unsafeProductionValues.join(", ")}`
  );
}

if (parsedEnv.NODE_ENV === "production" && parsedEnv.JWT_ACCESS_SECRET.length < 32) {
  throw new Error("JWT_ACCESS_SECRET must be at least 32 characters in production");
}

if (parsedEnv.NODE_ENV === "production" && parsedEnv.JWT_REFRESH_SECRET.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must be at least 32 characters in production");
}

export const env = {
  ...parsedEnv,
  USDA_API_KEY: usdaApiKey && usdaApiKey !== "YOUR_USDA_API_KEY_HERE" ? usdaApiKey : undefined,
  SMTP_HOST: smtpHost,
  SMTP_PORT: smtpPort,
  SMTP_SECURE: smtpSecure,
  APP_ORIGINS: appOrigins,
  PRIMARY_APP_ORIGIN: appOrigins[0] ?? defaultAppOrigins[0],
  HAS_SMTP_CONFIG: hasSmtpConfig
};
