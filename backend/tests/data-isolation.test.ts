import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { getDevelopmentOutbox } from "../src/lib/mailer";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

async function registerUser(prefix: string) {
  const email = uniqueEmail(prefix);
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "Password123!",
    displayName: `${prefix} user`
  });

  expect(response.status).toBe(202);
  const message = [...getDevelopmentOutbox()]
    .reverse()
    .find((item) => item.to === email && item.subject.includes("Verify"));
  const code = message?.text.match(/\b\d{6}\b/)?.[0];
  expect(code).toEqual(expect.any(String));

  const verifyResponse = await request(app).post("/api/v1/auth/verify-signup").send({
    email,
    code
  });

  expect(verifyResponse.status).toBe(200);
  return verifyResponse.body.accessToken as string;
}

async function findFoodId() {
  const response = await request(app).get("/api/v1/foods/search").query({ q: "banana", limit: 1 });
  expect(response.status).toBe(200);
  expect(response.body[0]?.id).toEqual(expect.any(String));
  return response.body[0].id as string;
}

describe("user data isolation", () => {
  it("prevents one user from deleting or seeing another user's meal data", async () => {
    const userOneToken = await registerUser("isolation-a");
    const userTwoToken = await registerUser("isolation-b");
    const foodId = await findFoodId();
    const consumedAt = "2026-05-12T12:00:00.000Z";

    const createMealResponse = await request(app)
      .post("/api/v1/meals")
      .set("Authorization", `Bearer ${userOneToken}`)
      .send({
        consumedAt,
        mealType: "breakfast",
        items: [{ foodId, portionCount: 1 }]
      });

    expect(createMealResponse.status).toBe(201);
    const mealId = createMealResponse.body.id as string;

    const crossUserDeleteResponse = await request(app)
      .delete(`/api/v1/meals/${mealId}`)
      .set("Authorization", `Bearer ${userTwoToken}`);
    expect(crossUserDeleteResponse.status).toBe(404);

    const crossUserUpdateResponse = await request(app)
      .patch(`/api/v1/meals/${mealId}`)
      .set("Authorization", `Bearer ${userTwoToken}`)
      .send({ mealType: "dinner" });
    expect(crossUserUpdateResponse.status).toBe(404);

    const userOneUpdateResponse = await request(app)
      .patch(`/api/v1/meals/${mealId}`)
      .set("Authorization", `Bearer ${userOneToken}`)
      .send({ mealType: "lunch" });
    expect(userOneUpdateResponse.status).toBe(200);
    expect(userOneUpdateResponse.body.mealType).toBe("lunch");

    const userTwoDashboardResponse = await request(app)
      .get("/api/v1/analytics/dashboard")
      .set("Authorization", `Bearer ${userTwoToken}`)
      .query({ date: "2026-05-12" });
    expect(userTwoDashboardResponse.status).toBe(200);
    expect(userTwoDashboardResponse.body.meals).toHaveLength(0);

    const userOneDashboardResponse = await request(app)
      .get("/api/v1/analytics/dashboard")
      .set("Authorization", `Bearer ${userOneToken}`)
      .query({ date: "2026-05-12" });
    expect(userOneDashboardResponse.status).toBe(200);
    expect(userOneDashboardResponse.body.meals).toHaveLength(1);
    expect(userOneDashboardResponse.body.meals[0].id).toBe(mealId);
    expect(userOneDashboardResponse.body.meals[0].mealType).toBe("lunch");
  });

  it("rejects unauthenticated and invalid meal requests", async () => {
    const unauthenticatedResponse = await request(app).post("/api/v1/meals").send({});
    expect(unauthenticatedResponse.status).toBe(401);

    const token = await registerUser("invalid-meal");
    const invalidMealResponse = await request(app)
      .post("/api/v1/meals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consumedAt: "not-a-date",
        mealType: "breakfast",
        items: []
      });

    expect(invalidMealResponse.status).toBe(400);
  });
});
