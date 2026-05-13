import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { authController } from "./auth.controller";
import { validateBody } from "../../middleware/validate";
import {
  deleteAccountSchema,
  loginSchema,
  logoutSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshSchema,
  registerSchema,
  resendSignupVerificationSchema,
  signupVerificationSchema
} from "./auth.validators";

export const authRouter = Router();

const authMutationLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please wait and try again."
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many password reset attempts. Please wait and try again."
  }
});

const signupVerificationLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many verification attempts. Please wait and try again."
  }
});

authRouter.post("/register", authMutationLimiter, validateBody(registerSchema), asyncHandler(authController.register.bind(authController)));
authRouter.post(
  "/verify-signup",
  signupVerificationLimiter,
  validateBody(signupVerificationSchema),
  asyncHandler(authController.verifySignup.bind(authController))
);
authRouter.post(
  "/verification/resend",
  signupVerificationLimiter,
  validateBody(resendSignupVerificationSchema),
  asyncHandler(authController.resendSignupVerification.bind(authController))
);
authRouter.post("/login", authMutationLimiter, validateBody(loginSchema), asyncHandler(authController.login.bind(authController)));
authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(authController.refresh.bind(authController)));
authRouter.post("/logout", validateBody(logoutSchema), asyncHandler(authController.logout.bind(authController)));
authRouter.post(
  "/password-reset/request",
  passwordResetLimiter,
  validateBody(passwordResetRequestSchema),
  asyncHandler(authController.requestPasswordReset.bind(authController))
);
authRouter.post(
  "/password-reset/confirm",
  authMutationLimiter,
  validateBody(passwordResetConfirmSchema),
  asyncHandler(authController.confirmPasswordReset.bind(authController))
);
authRouter.delete(
  "/account",
  requireAuth,
  authMutationLimiter,
  validateBody(deleteAccountSchema),
  asyncHandler(authController.deleteAccount.bind(authController))
);
