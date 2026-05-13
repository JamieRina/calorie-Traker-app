import { Request, Response } from "express";
import { authService } from "./auth.service";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  setRefreshTokenCookie
} from "./auth.cookies";
import { AuthenticatedRequest } from "../../middleware/auth";
import { ApiError } from "../../lib/api-error";

export class AuthController {
  async register(request: Request, response: Response) {
    const result = await authService.register(
      request.body.email,
      request.body.password,
      request.body.displayName
    );

    response.status(202).json(result);
  }

  async verifySignup(request: Request, response: Response) {
    const result = await authService.verifySignup(request.body.email, request.body.code);
    setRefreshTokenCookie(response, result.refreshToken);
    response.json({ accessToken: result.accessToken });
  }

  async resendSignupVerification(request: Request, response: Response) {
    const result = await authService.resendSignupVerification(request.body.email);
    response.json(result);
  }

  async login(request: Request, response: Response) {
    const result = await authService.login(request.body.email, request.body.password);
    setRefreshTokenCookie(response, result.refreshToken);
    response.json({ accessToken: result.accessToken });
  }

  async refresh(request: Request, response: Response) {
    const refreshToken = request.body.refreshToken ?? getRefreshTokenFromCookie(request);
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token is missing");
    }

    const result = await authService.refresh(refreshToken);
    setRefreshTokenCookie(response, result.refreshToken);
    response.json({ accessToken: result.accessToken });
  }

  async logout(request: Request, response: Response) {
    const refreshToken = request.body.refreshToken ?? getRefreshTokenFromCookie(request);
    const result = refreshToken
      ? await authService.logout(refreshToken)
      : { success: true, revoked: false };
    clearRefreshTokenCookie(response);
    response.json(result);
  }

  async requestPasswordReset(request: Request, response: Response) {
    const result = await authService.requestPasswordReset(request.body.email);
    response.json(result);
  }

  async confirmPasswordReset(request: Request, response: Response) {
    const result = await authService.confirmPasswordReset(request.body.token, request.body.password);
    clearRefreshTokenCookie(response);
    response.json(result);
  }

  async deleteAccount(request: AuthenticatedRequest, response: Response) {
    const result = await authService.deleteAccount(request.user!.sub, request.body.password);
    clearRefreshTokenCookie(response);
    response.json(result);
  }
}

export const authController = new AuthController();
