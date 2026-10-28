process.env.JWT_SECRET = "test_secret";
process.env.NODE_ENV = "test";
process.env.TEST_RATE_LIMIT = "1";

const request = require("supertest");
const app = require("../src/app");

describe("auth rate limiting (Exp 5)", () => {
  it("answers 429 after 20 attempts from one client", async () => {
    let last;
    for (let i = 0; i < 21; i += 1) {
      last = await request(app).post("/api/auth/login").send({ email: "not-an-email", password: "" });
    }
    expect(last.statusCode).toBe(429);
    expect(last.body.success).toBe(false);
  });
});
