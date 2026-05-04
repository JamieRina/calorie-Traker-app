import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ApiError } from "./api-error";

function isInfrastructureError(error: unknown) {
  if (error instanceof ApiError) {
    return false;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("can't reach database server") ||
    message.includes("connect econnrefused") ||
    message.includes("connection refused") ||
    message.includes("timed out") ||
    message.includes("server closed the connection unexpectedly")
  );
}

export async function withLocalFallback<T>(
  context: string,
  databaseOperation: () => Promise<T>,
  localOperation: () => Promise<T> | T
) {
  if (env.LOCAL_BACKEND_MODE === "force_local") {
    return await localOperation();
  }

  try {
    return await databaseOperation();
  } catch (error) {
    if (env.LOCAL_BACKEND_MODE === "database" || !isInfrastructureError(error)) {
      throw error;
    }

    logger.warn({ err: error, context }, "Using local backend fallback");
    return await localOperation();
  }
}
