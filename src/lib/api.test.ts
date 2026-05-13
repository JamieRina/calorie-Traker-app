import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, hasStoredSession, loginWithEmail, registerAccount, verifySignupCode } from "./api";

describe("api session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearSession();
    vi.restoreAllMocks();
  });

  it("stores only the short-lived access token outside localStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ accessToken: "access-token", refreshToken: "refresh-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await loginWithEmail("USER@example.com", "Password123!");

    expect(hasStoredSession()).toBe(true);
    expect(window.localStorage.getItem("bitebalance-session")).toBeNull();
    expect(window.sessionStorage.getItem("bitebalance-session")).toContain("access-token");
    expect(window.sessionStorage.getItem("bitebalance-session")).not.toContain("refresh-token");
  });

  it("keeps signup pending until the email code is verified", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/register")) {
        return new Response(JSON.stringify({ requiresVerification: true, email: "user@example.test", expiresInMinutes: 10 }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ accessToken: "verified-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = await registerAccount({
      displayName: "User",
      email: "USER@example.test",
      password: "Password123!",
      age: 30,
      heightCm: 175,
      currentWeightKg: 80,
      targetWeightKg: 75,
      goalType: "lose",
      activityLevel: "moderate",
    });

    expect(pending.requiresVerification).toBe(true);
    expect(hasStoredSession()).toBe(false);

    await verifySignupCode("USER@example.test", "123456");

    expect(hasStoredSession()).toBe(true);
    expect(window.sessionStorage.getItem("bitebalance-session")).toContain("verified-access-token");
  });
});
