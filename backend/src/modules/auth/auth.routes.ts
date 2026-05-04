import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { authController } from "./auth.controller";
import { validateBody } from "../../middleware/validate";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.validators";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), asyncHandler(authController.register.bind(authController)));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(authController.login.bind(authController)));
authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(authController.refresh.bind(authController)));
authRouter.post("/logout", validateBody(logoutSchema), asyncHandler(authController.logout.bind(authController)));
