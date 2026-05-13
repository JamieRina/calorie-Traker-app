import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      LOCAL_BACKEND_MODE: "force_local",
      USDA_API_KEY: "",
      SMTP_PROVIDER: "custom",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_FROM: "",
      LOG_LEVEL: "silent"
    }
  }
});
