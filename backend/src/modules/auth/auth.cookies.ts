import { Request, Response } from "express";
import { env } from "../../config/env";
import { durationToMilliseconds } from "../../utils/duration";

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex === -1) {
          return [entry, ""] as const;
        }

        return [
          decodeURIComponent(entry.slice(0, separatorIndex)),
          decodeURIComponent(entry.slice(separatorIndex + 1))
        ] as const;
      })
  );
}

export function getRefreshTokenFromCookie(request: Request) {
  return parseCookies(request.headers.cookie).get(env.AUTH_REFRESH_COOKIE_NAME);
}

export function setRefreshTokenCookie(response: Response, refreshToken: string) {
  response.cookie(env.AUTH_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    domain: env.AUTH_COOKIE_DOMAIN,
    path: "/api/v1/auth",
    maxAge: durationToMilliseconds(env.JWT_REFRESH_TTL),
    signed: false
  });
}

export function clearRefreshTokenCookie(response: Response) {
  response.clearCookie(env.AUTH_REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    domain: env.AUTH_COOKIE_DOMAIN,
    path: "/api/v1/auth"
  });
}
