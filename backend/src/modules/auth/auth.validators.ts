import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(60)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshTokenSchema = z.string().min(10);

export const refreshSchema = z.object({
  refreshToken: refreshTokenSchema
});

export const logoutSchema = z.object({
  refreshToken: refreshTokenSchema
});
