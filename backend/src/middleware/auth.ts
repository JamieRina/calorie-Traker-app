import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "../lib/api-error";
import { localBackend } from "../lib/local-backend";
import { withLocalFallback } from "../lib/local-fallback";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

export async function requireAuth(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid authorisation header"));
  }

  const token = authHeader.replace("Bearer ", "");

  let payload: { sub: string; email: string };

  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string };
  } catch {
    next(new ApiError(401, "Session expired or invalid"));
    return;
  }

  try {
    const user = await withLocalFallback(
      "auth.requireAuth",
      async () =>
        prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true }
        }),
      async () => localBackend.getUserById(payload.sub)
    );

    if (!user) {
      return next(new ApiError(401, "Session expired or invalid"));
    }

    request.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}
