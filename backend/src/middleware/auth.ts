import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../lib/api-error";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
  };
}

export function requireAuth(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Missing or invalid authorisation header"));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; email: string };
    request.user = payload;
    next();
  } catch {
    next(new ApiError(401, "Session expired or invalid"));
  }
}
