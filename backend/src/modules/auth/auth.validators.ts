import { z } from "zod";

const normalisedEmailSchema = z.string().trim().email().toLowerCase();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  email: normalisedEmailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(60)
});

export const loginSchema = z.object({
  email: normalisedEmailSchema,
  password: z.string().min(1).max(128)
});

export const signupVerificationSchema = z.object({
  email: normalisedEmailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code")
});

export const resendSignupVerificationSchema = z.object({
  email: normalisedEmailSchema
});

const refreshTokenSchema = z.string().min(10);

export const refreshSchema = z.object({
  refreshToken: refreshTokenSchema.optional()
});

export const logoutSchema = z.object({
  refreshToken: refreshTokenSchema.optional()
});

export const passwordResetRequestSchema = z.object({
  email: normalisedEmailSchema
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128)
});
