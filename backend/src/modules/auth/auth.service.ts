import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

type RefreshTokenStore = Pick<typeof prisma, "refreshToken">;

function resolveRefreshExpiryDate(ttl: string) {
  const match = ttl.match(/^(\d+)([mhd])$/i);
  if (!match) {
    return dayjs().add(30, "day").toDate();
  }

  const amount = Number(match[1]);
  const unitMap = {
    m: "minute",
    h: "hour",
    d: "day"
  } satisfies Record<string, dayjs.ManipulateType>;

  const unitKey = match[2].toLowerCase() as keyof typeof unitMap;
  return dayjs().add(amount, unitMap[unitKey]).toDate();
}

export class AuthService {
  async register(email: string, password: string, displayName: string) {
    return withLocalFallback(
      "auth.register",
      async () => {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throw new ApiError(409, "An account with that email already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            displayName,
            profile: { create: {} }
          }
        });

        return this.issueTokens(prisma, user.id, user.email);
      },
      async () => {
        const user = await localBackend.register(email, password, displayName);
        return this.issueLocalTokens(user.id, user.email);
      }
    );
  }

  async login(email: string, password: string) {
    return withLocalFallback(
      "auth.login",
      async () => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new ApiError(401, "Invalid login details");
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          throw new ApiError(401, "Invalid login details");
        }

        return this.issueTokens(prisma, user.id, user.email);
      },
      async () => {
        const user = await localBackend.login(email, password);
        return this.issueLocalTokens(user.id, user.email);
      }
    );
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string };

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "Refresh token is invalid or expired");
    }

    return withLocalFallback(
      "auth.refresh",
      async () => {
        const hashed = hashToken(refreshToken);
        const stored = await prisma.refreshToken.findFirst({
          where: {
            tokenHash: hashed,
            revokedAt: null,
            userId: payload.sub
          },
          include: {
            user: true
          }
        });

        if (!stored || stored.expiresAt < new Date()) {
          throw new ApiError(401, "Refresh token is invalid or expired");
        }

        return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
          await transaction.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() }
          });

          return this.issueTokens(transaction, stored.user.id, stored.user.email);
        });
      },
      async () => {
        const user = localBackend.getUserById(payload.sub);
        if (!user) {
          throw new ApiError(401, "Refresh token is invalid or expired");
        }

        return this.issueLocalTokens(user.id, user.email);
      }
    );
  }

  async logout(refreshToken: string) {
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      return { success: true, revoked: false };
    }

    return withLocalFallback(
      "auth.logout",
      async () => {
        const result = await prisma.refreshToken.updateMany({
          where: {
            tokenHash: hashToken(refreshToken),
            revokedAt: null
          },
          data: {
            revokedAt: new Date()
          }
        });

        return {
          success: true,
          revoked: result.count > 0
        };
      },
      async () => ({
        success: true,
        revoked: false
      })
    );
  }

  private async issueTokens(store: RefreshTokenStore, userId: string, email: string) {
    const accessToken = signAccessToken({ sub: userId, email });
    const refreshToken = signRefreshToken({ sub: userId, email });

    await store.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: resolveRefreshExpiryDate(env.JWT_REFRESH_TTL)
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  private issueLocalTokens(userId: string, email: string) {
    return {
      accessToken: signAccessToken({ sub: userId, email }),
      refreshToken: signRefreshToken({ sub: userId, email })
    };
  }
}

export const authService = new AuthService();
