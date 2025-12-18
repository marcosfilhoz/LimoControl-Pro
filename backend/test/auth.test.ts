import request from "supertest";
import { createApp } from "../src/app";

describe("auth + protected routes", () => {
  const app = createApp();

  it("GET /health should be public", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /dashboard should require auth", async () => {
    const res = await request(app).get("/dashboard");
    expect(res.status).toBe(401);
  });

  it("POST /auth/login should return token with valid credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email: "admin@limo.local", password: "admin" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("admin@limo.local");
  });

  it("GET /dashboard should work with Bearer token", async () => {
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "admin@limo.local", password: "admin" });
    const token = login.body.token as string;

    const res = await request(app).get("/dashboard").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalTrips).toBe("number");
  });
});


