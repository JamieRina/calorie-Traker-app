import { Request, Response } from "express";
import { authService } from "./auth.service";

export class AuthController {
  async register(request: Request, response: Response) {
    const result = await authService.register(
      request.body.email,
      request.body.password,
      request.body.displayName
    );

    response.status(201).json(result);
  }

  async login(request: Request, response: Response) {
    const result = await authService.login(request.body.email, request.body.password);
    response.json(result);
  }

  async refresh(request: Request, response: Response) {
    const result = await authService.refresh(request.body.refreshToken);
    response.json(result);
  }

  async logout(request: Request, response: Response) {
    const result = await authService.logout(request.body.refreshToken);
    response.json(result);
  }
}

export const authController = new AuthController();
