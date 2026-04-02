import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { asyncHandler } from "./lib/async-handler";
import { errorHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";

export const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const isAllowedOrigin = (origin?: string) => {
  if (!origin) {
    return true;
  }

  if (env.APP_ORIGINS.includes(origin)) {
    return true;
  }

  return env.NODE_ENV !== "production" && localhostOriginPattern.test(origin);
};

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? "unknown"} is not allowed by CORS`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use((request, response, next) => {
  const startedAt = Date.now();

  response.on("finish", () => {
    logger.info(
      {
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt
      },
      "Request completed"
    );
  });

  next();
});
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/", (_request, response) => {
  response.status(200).type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>NutriTrack API</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #fff8f2, #f4fbfb);
            color: #1f2937;
          }
          main {
            max-width: 680px;
            margin: 64px auto;
            padding: 24px;
          }
          .card {
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid #f1ddd0;
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 16px 40px -28px rgba(31, 41, 55, 0.28);
          }
          a {
            color: #0f9cab;
            font-weight: 700;
            text-decoration: none;
          }
          code {
            background: #f8efe8;
            border-radius: 10px;
            padding: 2px 8px;
          }
        </style>
      </head>
      <body>
        <main>
          <div class="card">
            <p><strong>NutriTrack backend API</strong></p>
            <h1>This port is the backend</h1>
            <p>Open the website at <a href="${env.PRIMARY_APP_ORIGIN}" target="_blank" rel="noreferrer">${env.PRIMARY_APP_ORIGIN}</a>.</p>
            <p>API health check: <code>/health</code></p>
          </div>
        </main>
      </body>
    </html>
  `);
});

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get(
  "/health/deep",
  asyncHandler(async (_request, response) => {
    if (env.LOCAL_BACKEND_MODE === "force_local") {
      response.status(200).json({
        status: "ok",
        mode: "local",
        dependencies: {
          postgres: "local",
          redis: "disabled"
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const dependencies: Record<string, "ok" | "error"> = {
      postgres: "error",
      redis: "error"
    };
    let statusCode = 200;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dependencies.postgres = "ok";
    } catch (error) {
      statusCode = 503;
      logger.error({ err: error }, "Postgres health check failed");
    }

    try {
      const ping = await redis.ping();
      dependencies.redis = ping === "PONG" ? "ok" : "error";
      if (ping !== "PONG") {
        statusCode = 503;
      }
    } catch (error) {
      statusCode = 503;
      logger.error({ err: error }, "Redis health check failed");
    }

    response.status(statusCode).json({
      status: statusCode === 200 ? "ok" : "degraded",
      dependencies,
      timestamp: new Date().toISOString()
    });
  })
);

app.use("/api/v1", apiRouter);
app.use(errorHandler);
