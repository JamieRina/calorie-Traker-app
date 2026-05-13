import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "currentPassword",
      "newPassword",
      "token",
      "refreshToken",
      "accessToken",
      "authorization",
      "headers.authorization",
      "req.headers.authorization",
      "cookie",
      "headers.cookie",
      "req.headers.cookie",
      "*.password",
      "*.refreshToken",
      "*.accessToken",
      "*.tokenHash"
    ],
    censor: "[redacted]"
  },
  transport: env.NODE_ENV === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard"
        }
      }
    : undefined
});
