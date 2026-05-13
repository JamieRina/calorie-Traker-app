import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../lib/api-error";
import { localBackend } from "../../lib/local-backend";
import { withLocalFallback } from "../../lib/local-fallback";
import { sendMail } from "../../lib/mailer";
import { addDurationFromNow } from "../../utils/duration";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

type RefreshTokenStore = Pick<typeof prisma, "refreshToken">;
type EmailVerificationStore = Pick<typeof prisma, "emailVerificationToken">;

type EmailVerificationTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  resendCount: number;
  verifyAttemptCount: number;
  lastSentAt: Date;
};

function createResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createOtpCode() {
  return String(crypto.randomInt(100000, 1_000_000));
}

function hashVerificationCode(userId: string, code: string) {
  return hashToken(`${userId}:${code}`);
}

function buildPasswordResetUrl(token: string) {
  const baseUrl = env.PASSWORD_RESET_BASE_URL ?? env.PRIMARY_APP_ORIGIN;
  const url = new URL(baseUrl);
  url.searchParams.set("resetToken", token);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = buildPasswordResetUrl(token);
  const escapedResetUrl = escapeHtml(resetUrl);

  await sendMail({
    to: email,
    subject: "Reset your BiteBalance password",
    text: [
      "Use this secure link to reset your BiteBalance password.",
      "",
      resetUrl,
      "",
      `This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.`
    ].join("\n"),
    html: [
      "<!doctype html>",
      '<html lang="en">',
      "<body>",
      "<h1>Reset your BiteBalance password</h1>",
      "<p>Use this secure link to reset your BiteBalance password.</p>",
      `<p><a href="${escapedResetUrl}">Reset your password</a></p>`,
      `<p>This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p>`,
      "</body>",
      "</html>"
    ].join("")
  });
}

async function sendSignupVerificationEmail(email: string, code: string) {
  const escapedCode = escapeHtml(code);

  await sendMail({
    to: email,
    subject: "Verify your BiteBalance account",
    text: [
      "Use this verification code to finish creating your BiteBalance account.",
      "",
      code,
      "",
      `This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you did not request it, you can ignore this email.`
    ].join("\n"),
    html: [
      "<!doctype html>",
      '<html lang="en">',
      '<body style="margin:0;background:#f6faf6;font-family:Arial,sans-serif;color:#183126;">',
      '<div style="max-width:520px;margin:0 auto;padding:32px 18px;">',
      '<div style="border-radius:24px;background:#ffffff;padding:28px;border:1px solid #dfe9df;">',
      '<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2d7a4c;">BiteBalance</p>',
      '<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#183126;">Verify your account</h1>',
      '<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#4f6258;">Enter this code in the app to finish creating your account.</p>',
      `<div style="border-radius:18px;background:#eef7ef;padding:18px;text-align:center;font-size:30px;font-weight:800;letter-spacing:.24em;color:#183126;">${escapedCode}</div>`,
      `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#6a786f;">This code expires in ${env.OTP_EXPIRY_MINUTES} minutes. If you did not request it, you can ignore this email.</p>`,
      "</div>",
      "</div>",
      "</body>",
      "</html>"
    ].join("")
  });
}

export class AuthService {
  async register(email: string, password: string, displayName: string) {
    return withLocalFallback(
      "auth.register",
      async () => {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser?.isEmailVerified) {
          return {
            requiresVerification: true,
            email,
            expiresInMinutes: env.OTP_EXPIRY_MINUTES
          };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = existingUser
          ? await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                passwordHash,
                displayName
              }
            })
          : await prisma.user.create({
              data: {
                email,
                passwordHash,
                displayName,
                isEmailVerified: false,
                profile: { create: {} }
              }
            });

        await this.createAndSendVerificationCode(prisma, user.id, user.email);

        return {
          requiresVerification: true,
          email,
          expiresInMinutes: env.OTP_EXPIRY_MINUTES
        };
      },
      async () => {
        const user = await localBackend.createPendingRegistration(email, password, displayName);
        if (!user.isEmailVerified) {
          await this.createAndSendLocalVerificationCode(user.id, user.email);
        }

        return {
          requiresVerification: true,
          email,
          expiresInMinutes: env.OTP_EXPIRY_MINUTES
        };
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

        if (!user.isEmailVerified) {
          throw new ApiError(403, "Verify your email before logging in");
        }

        return this.issueTokens(prisma, user.id, user.email);
      },
      async () => {
        const user = await localBackend.login(email, password);
        if (!user.isEmailVerified) {
          throw new ApiError(403, "Verify your email before logging in");
        }

        return this.issueLocalTokens(user.id, user.email);
      }
    );
  }

  async verifySignup(email: string, code: string) {
    return withLocalFallback(
      "auth.verifySignup",
      async () => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.isEmailVerified) {
          throw new ApiError(400, "Verification code is invalid or expired");
        }

        const token = await this.getLatestVerificationToken(prisma, user.id);
        this.assertVerificationTokenUsable(token);

        if (token.tokenHash !== hashVerificationCode(user.id, code)) {
          await prisma.emailVerificationToken.update({
            where: { id: token.id },
            data: { verifyAttemptCount: { increment: 1 } }
          });
          throw new ApiError(400, "Verification code is incorrect");
        }

        return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
          await transaction.user.update({
            where: { id: user.id },
            data: { isEmailVerified: true }
          });

          await transaction.emailVerificationToken.update({
            where: { id: token.id },
            data: { consumedAt: new Date() }
          });

          await transaction.emailVerificationToken.updateMany({
            where: {
              userId: user.id,
              consumedAt: null,
              id: { not: token.id }
            },
            data: { consumedAt: new Date() }
          });

          return this.issueTokens(transaction, user.id, user.email);
        });
      },
      async () => {
        const user = localBackend.getUserByEmail(email);
        if (!user || user.isEmailVerified) {
          throw new ApiError(400, "Verification code is invalid or expired");
        }

        const token = localBackend.getLatestEmailVerificationToken(user.id);
        this.assertLocalVerificationTokenUsable(token);

        if (token.tokenHash !== hashVerificationCode(user.id, code)) {
          localBackend.incrementEmailVerificationAttempts(token.id);
          throw new ApiError(400, "Verification code is incorrect");
        }

        localBackend.markEmailVerified(user.id, token.id);
        return this.issueLocalTokens(user.id, user.email);
      }
    );
  }

  async resendSignupVerification(email: string) {
    return withLocalFallback(
      "auth.resendSignupVerification",
      async () => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.isEmailVerified) {
          await this.createAndSendVerificationCode(prisma, user.id, user.email);
        }

        return {
          success: true,
          expiresInMinutes: env.OTP_EXPIRY_MINUTES
        };
      },
      async () => {
        const user = localBackend.getUserByEmail(email);
        if (user && !user.isEmailVerified) {
          await this.createAndSendLocalVerificationCode(user.id, user.email);
        }

        return {
          success: true,
          expiresInMinutes: env.OTP_EXPIRY_MINUTES
        };
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

  async requestPasswordReset(email: string) {
    return withLocalFallback(
      "auth.requestPasswordReset",
      async () => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return { success: true };
        }

        const token = createResetToken();
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt: addDurationFromNow(`${env.PASSWORD_RESET_TTL_MINUTES}m`, 1)
          }
        });

        await sendPasswordResetEmail(user.email, token);

        return env.NODE_ENV === "production"
          ? { success: true }
          : { success: true, debugResetToken: token };
      },
      async () => {
        const result = await localBackend.requestPasswordReset(email, env.PASSWORD_RESET_TTL_MINUTES);
        if (result.email && result.token) {
          await sendPasswordResetEmail(result.email, result.token);
        }

        return env.NODE_ENV === "production"
          ? { success: true }
          : { success: true, debugResetToken: result.token };
      }
    );
  }

  async confirmPasswordReset(token: string, password: string) {
    const tokenHash = hashToken(token);

    return withLocalFallback(
      "auth.confirmPasswordReset",
      async () => {
        const stored = await prisma.passwordResetToken.findUnique({
          where: { tokenHash },
          include: { user: true }
        });

        if (!stored || stored.consumedAt || stored.expiresAt < new Date()) {
          throw new ApiError(400, "Password reset link is invalid or expired");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
          await transaction.user.update({
            where: { id: stored.userId },
            data: { passwordHash }
          });

          await transaction.passwordResetToken.update({
            where: { id: stored.id },
            data: { consumedAt: new Date() }
          });

          await transaction.refreshToken.updateMany({
            where: {
              userId: stored.userId,
              revokedAt: null
            },
            data: { revokedAt: new Date() }
          });
        });

        return { success: true };
      },
      async () => localBackend.confirmPasswordReset(tokenHash, password)
    );
  }

  async deleteAccount(userId: string, password: string) {
    return withLocalFallback(
      "auth.deleteAccount",
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new ApiError(404, "User not found");
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          throw new ApiError(401, "Password is incorrect");
        }

        await prisma.user.delete({
          where: { id: userId }
        });

        return { success: true };
      },
      async () => localBackend.deleteAccount(userId, password)
    );
  }

  private async createAndSendVerificationCode(store: EmailVerificationStore, userId: string, email: string) {
    const latestToken = await this.getLatestVerificationToken(store, userId, false);
    const resendCount = this.getNextResendCount(latestToken);
    this.assertCanSendVerificationToken(latestToken, resendCount);

    const code = createOtpCode();

    await store.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashVerificationCode(userId, code),
        expiresAt: addDurationFromNow(`${env.OTP_EXPIRY_MINUTES}m`, 1),
        resendCount
      }
    });

    await sendSignupVerificationEmail(email, code);
  }

  private async createAndSendLocalVerificationCode(userId: string, email: string) {
    const latestToken = localBackend.getLatestEmailVerificationToken(userId, false);
    const resendCount = this.getNextResendCount(latestToken);
    this.assertCanSendVerificationToken(latestToken, resendCount);

    const code = createOtpCode();
    localBackend.createEmailVerificationToken({
      userId,
      tokenHash: hashVerificationCode(userId, code),
      expiresAt: addDurationFromNow(`${env.OTP_EXPIRY_MINUTES}m`, 1).toISOString(),
      resendCount
    });

    await sendSignupVerificationEmail(email, code);
  }

  private async getLatestVerificationToken(store: EmailVerificationStore, userId: string, shouldThrow = true) {
    const token = await store.emailVerificationToken.findFirst({
      where: {
        userId,
        consumedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!token && shouldThrow) {
      throw new ApiError(400, "Verification code is invalid or expired");
    }

    return token;
  }

  private assertVerificationTokenUsable(token: EmailVerificationTokenRecord | null): asserts token is EmailVerificationTokenRecord {
    if (!token) {
      throw new ApiError(400, "Verification code is invalid or expired");
    }

    if (token.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "Verification code expired. Request a new code.");
    }

    if (token.verifyAttemptCount >= env.OTP_MAX_VERIFY_ATTEMPTS) {
      throw new ApiError(429, "Too many verification attempts. Request a new code.");
    }
  }

  private assertLocalVerificationTokenUsable(
    token: ReturnType<typeof localBackend.getLatestEmailVerificationToken>
  ): asserts token is NonNullable<ReturnType<typeof localBackend.getLatestEmailVerificationToken>> {
    if (!token) {
      throw new ApiError(400, "Verification code is invalid or expired");
    }

    if (new Date(token.expiresAt).getTime() < Date.now()) {
      localBackend.expireEmailVerificationToken(token.id);
      throw new ApiError(400, "Verification code expired. Request a new code.");
    }

    if (token.verifyAttemptCount >= env.OTP_MAX_VERIFY_ATTEMPTS) {
      throw new ApiError(429, "Too many verification attempts. Request a new code.");
    }
  }

  private getNextResendCount(token: EmailVerificationTokenRecord | ReturnType<typeof localBackend.getLatestEmailVerificationToken> | null) {
    if (!token || new Date(token.expiresAt).getTime() < Date.now()) {
      return 0;
    }

    return token.resendCount + 1;
  }

  private assertCanSendVerificationToken(
    token: EmailVerificationTokenRecord | ReturnType<typeof localBackend.getLatestEmailVerificationToken> | null,
    resendCount: number
  ) {
    if (!token) {
      return;
    }

    if (new Date(token.expiresAt).getTime() < Date.now()) {
      return;
    }

    if (Date.now() - new Date(token.lastSentAt).getTime() < env.OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new ApiError(429, "Please wait before requesting another verification code.");
    }

    if (resendCount > env.OTP_MAX_RESENDS) {
      throw new ApiError(429, "Too many verification codes requested. Please try again later.");
    }
  }

  private async issueTokens(store: RefreshTokenStore, userId: string, email: string) {
    const accessToken = signAccessToken({ sub: userId, email });
    const refreshToken = signRefreshToken({ sub: userId, email });

    await store.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: addDurationFromNow(env.JWT_REFRESH_TTL)
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
