import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { localBackend } from "../src/lib/local-backend";
import { clearDevelopmentOutbox, getDevelopmentOutbox } from "../src/lib/mailer";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

function getLatestVerificationCode(email: string) {
  const message = [...getDevelopmentOutbox()]
    .reverse()
    .find((item) => item.to === email && item.subject.includes("Verify"));
  const code = message?.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toEqual(expect.any(String));
  return code!;
}

describe("auth flow", () => {
  beforeEach(() => {
    clearDevelopmentOutbox();
  });

  it("supports signup, login, refresh, logout, password reset, and account deletion", async () => {
    const agent = request.agent(app);
    const email = uniqueEmail("auth");
    const originalPassword = "Password123!";
    const nextPassword = "NewPassword123!";

    const registerResponse = await agent.post("/api/v1/auth/register").send({
      email,
      password: originalPassword,
      displayName: "Auth Tester"
    });

    expect(registerResponse.status).toBe(202);
    expect(registerResponse.body).toMatchObject({
      requiresVerification: true,
      email,
      expiresInMinutes: expect.any(Number)
    });
    expect(registerResponse.body.accessToken).toBeUndefined();

    const unverifiedLoginResponse = await agent.post("/api/v1/auth/login").send({
      email,
      password: originalPassword
    });
    expect(unverifiedLoginResponse.status).toBe(403);

    const wrongCodeResponse = await agent.post("/api/v1/auth/verify-signup").send({
      email,
      code: "000000"
    });
    expect(wrongCodeResponse.status).toBe(400);

    const verifyResponse = await agent.post("/api/v1/auth/verify-signup").send({
      email,
      code: getLatestVerificationCode(email)
    });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
    expect(verifyResponse.body.refreshToken).toBeUndefined();
    const setCookie = verifyResponse.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
    expect(cookieHeader).toContain("HttpOnly");

    const profileResponse = await agent
      .get("/api/v1/profile/me")
      .set("Authorization", `Bearer ${verifyResponse.body.accessToken}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe(email);

    const logoutResponse = await agent.post("/api/v1/auth/logout").send({});
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const loginResponse = await agent.post("/api/v1/auth/login").send({
      email,
      password: originalPassword
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));

    const refreshResponse = await agent.post("/api/v1/auth/refresh").send({});
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));

    const resetRequestResponse = await agent.post("/api/v1/auth/password-reset/request").send({ email });
    expect(resetRequestResponse.status).toBe(200);
    expect(resetRequestResponse.body.success).toBe(true);
    expect(resetRequestResponse.body.debugResetToken).toEqual(expect.any(String));

    const resetConfirmResponse = await agent.post("/api/v1/auth/password-reset/confirm").send({
      token: resetRequestResponse.body.debugResetToken,
      password: nextPassword
    });
    expect(resetConfirmResponse.status).toBe(200);
    expect(resetConfirmResponse.body.success).toBe(true);

    const oldPasswordResponse = await agent.post("/api/v1/auth/login").send({
      email,
      password: originalPassword
    });
    expect(oldPasswordResponse.status).toBe(401);

    const newPasswordResponse = await agent.post("/api/v1/auth/login").send({
      email,
      password: nextPassword
    });
    expect(newPasswordResponse.status).toBe(200);

    const badDeleteResponse = await agent
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${newPasswordResponse.body.accessToken}`)
      .send({ password: "WrongPassword123!" });
    expect(badDeleteResponse.status).toBe(401);

    const deleteResponse = await agent
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${newPasswordResponse.body.accessToken}`)
      .send({ password: nextPassword });
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);

    const deletedLoginResponse = await agent.post("/api/v1/auth/login").send({
      email,
      password: nextPassword
    });
    expect(deletedLoginResponse.status).toBe(401);
  });

  it("rejects weak passwords with validation errors", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: uniqueEmail("weak"),
      password: "password",
      displayName: "Weak Password"
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(JSON.stringify(response.body.issues)).toContain("uppercase");
  });

  it("protects signup verification resend, expiry, and attempt limits", async () => {
    const email = uniqueEmail("verify");
    const password = "Password123!";

    const registerResponse = await request(app).post("/api/v1/auth/register").send({
      email,
      password,
      displayName: "Verify Tester"
    });
    expect(registerResponse.status).toBe(202);

    const immediateResendResponse = await request(app)
      .post("/api/v1/auth/verification/resend")
      .send({ email });
    expect(immediateResendResponse.status).toBe(429);

    const user = localBackend.getUserByEmail(email);
    expect(user).not.toBeNull();
    const initialToken = localBackend.getLatestEmailVerificationToken(user!.id);
    localBackend.expireEmailVerificationToken(initialToken.id);

    const expiredResponse = await request(app).post("/api/v1/auth/verify-signup").send({
      email,
      code: getLatestVerificationCode(email)
    });
    expect(expiredResponse.status).toBe(400);
    expect(expiredResponse.body.message).toContain("expired");

    const resendResponse = await request(app)
      .post("/api/v1/auth/verification/resend")
      .send({ email });
    expect(resendResponse.status).toBe(200);
    expect(resendResponse.body.success).toBe(true);

    const nextCode = getLatestVerificationCode(email);
    const verifyResponse = await request(app).post("/api/v1/auth/verify-signup").send({
      email,
      code: nextCode
    });
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
  });
});
