process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../src/app");

describe("GET /api/health", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });
});

describe("404 handler", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("protected routes", () => {
  it("rejects requests with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("validation", () => {
  it("rejects register with a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "short" });
    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
