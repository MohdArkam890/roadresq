const request = require("supertest");
const db = require("./helpers/db");
const { registerUser, makeMechanic, auth, MUMBAI, app } = require("./helpers/factory");
const User = require("../src/models/User");
const Request = require("../src/models/Request");

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.disconnect);

const createReq = (token, body = {}) =>
  request(app).post("/api/requests").set(auth(token)).send({ problemType: "battery", location: MUMBAI, ...body });

describe("Auth & roles (Exp 6)", () => {
  it("registers, hashes the password, and returns a JWT", async () => {
    const { res } = await registerUser("customer");
    expect(res.statusCode).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.password).toBeUndefined();
    const stored = await User.findOne({ email: res.body.data.user.email }).select("+password");
    expect(stored.password).not.toBe("password123");
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it("rejects a duplicate email with 409", async () => {
    const a = await registerUser("customer");
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "x", email: a.user.email, password: "password123" });
    expect(res.statusCode).toBe(409);
  });

  it("does not allow self-registering as admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Eve", email: "eve@test.dev", password: "password123", role: "admin" });
    expect(res.statusCode).toBe(422);
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    const a = await registerUser("customer");
    const ok = await request(app).post("/api/auth/login").send({ email: a.user.email, password: "password123" });
    expect(ok.statusCode).toBe(200);
    const bad = await request(app).post("/api/auth/login").send({ email: a.user.email, password: "wrongpass1" });
    expect(bad.statusCode).toBe(401);
  });

  it("GET /me works with a token and rejects a tampered one", async () => {
    const a = await registerUser("customer");
    const ok = await request(app).get("/api/auth/me").set(auth(a.token));
    expect(ok.body.data.user.email).toBe(a.user.email);
    const bad = await request(app).get("/api/auth/me").set(auth(a.token + "x"));
    expect(bad.statusCode).toBe(401);
  });

  it("enforces roles: mechanic cannot add vehicles, customer cannot use admin routes", async () => {
    const m = await registerUser("mechanic", { specialty: "battery" });
    const c = await registerUser("customer");
    const v = await request(app).post("/api/vehicles").set(auth(m.token)).send({ name: "A", plate: "B" });
    expect(v.statusCode).toBe(403);
    const a = await request(app).get("/api/admin/stats").set(auth(c.token));
    expect(a.statusCode).toBe(403);
  });
});

describe("Vehicles", () => {
  it("CRUD is scoped to the owner and ignores mass-assigned fields", async () => {
    const a = await registerUser("customer");
    const b = await registerUser("customer");

    const created = await request(app)
      .post("/api/vehicles")
      .set(auth(a.token))
      .send({ name: "City", plate: "mh01ab1", type: "Sedan", owner: b.user.id });
    expect(created.statusCode).toBe(201);
    expect(created.body.data.plate).toBe("MH01AB1");
    expect(String(created.body.data.owner)).toBe(String(a.user.id));

    const bList = await request(app).get("/api/vehicles").set(auth(b.token));
    expect(bList.body.data).toHaveLength(0);

    const bDelete = await request(app).delete(`/api/vehicles/${created.body.data._id}`).set(auth(b.token));
    expect(bDelete.statusCode).toBe(404);
    const aDelete = await request(app).delete(`/api/vehicles/${created.body.data._id}`).set(auth(a.token));
    expect(aDelete.statusCode).toBe(200);
  });

  it("returns a clean 422 for a malformed id instead of a 500", async () => {
    const a = await registerUser("customer");
    const res = await request(app).delete("/api/vehicles/not-an-id").set(auth(a.token));
    expect(res.statusCode).toBe(422);
  });
});

describe("Request lifecycle (Exp 4–6)", () => {
  it("matches the best available mechanic and runs the full status flow", async () => {
    const c = await registerUser("customer");
    const m = await makeMechanic();

    const created = await createReq(c.token);
    expect(created.statusCode).toBe(201);
    expect(created.body.data.status).toBe("matched");
    expect(created.body.data.mechanic.name).toBe(m.user.name);
    expect(created.body.data.fare).toBe(420);
    const id = created.body.data._id;

    for (const status of ["on_the_way", "arrived", "in_progress", "completed"]) {
      const res = await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
    const final = await Request.findById(id);
    expect(final.statusHistory.map((h) => h.status)).toEqual([
      "matched", "on_the_way", "arrived", "in_progress", "completed",
    ]);
  });

  it("stays 'requested' when no mechanic is available", async () => {
    const c = await registerUser("customer");
    await makeMechanic({ available: false });
    const res = await createReq(c.token);
    expect(res.body.data.status).toBe("requested");
    expect(res.body.data.mechanic).toBeNull();
  });

  it("allows only one active request per customer", async () => {
    const c = await registerUser("customer");
    await makeMechanic();
    expect((await createReq(c.token)).statusCode).toBe(201);
    expect((await createReq(c.token)).statusCode).toBe(409);
  });

  it("rejects skipping steps, mechanic cancelling, and edits to finished requests", async () => {
    const c = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    const patch = (token, status) => request(app).patch(`/api/requests/${id}/status`).set(auth(token)).send({ status });

    expect((await patch(m.token, "completed")).statusCode).toBe(409); // skip ahead
    expect((await patch(m.token, "cancelled")).statusCode).toBe(403); // mechanic can't cancel
    expect((await patch(c.token, "on_the_way")).statusCode).toBe(403); // customer can't advance

    await patch(m.token, "on_the_way");
    const cancel = await request(app).patch(`/api/requests/${id}/cancel`).set(auth(c.token));
    expect(cancel.statusCode).toBe(200);
    expect((await patch(m.token, "arrived")).statusCode).toBe(409); // terminal
    expect((await request(app).patch(`/api/requests/${id}/cancel`).set(auth(c.token))).statusCode).toBe(409);
  });

  it("cannot cancel once work has started", async () => {
    const c = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    for (const status of ["on_the_way", "arrived", "in_progress"]) {
      await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status });
    }
    const res = await request(app).patch(`/api/requests/${id}/cancel`).set(auth(c.token));
    expect(res.statusCode).toBe(409);
  });

  it("hides requests from non-participants (403) and scopes lists by role", async () => {
    const c = await registerUser("customer");
    const other = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;

    expect((await request(app).get(`/api/requests/${id}`).set(auth(other.token))).statusCode).toBe(403);
    expect((await request(app).get(`/api/requests/${id}`).set(auth(m.token))).statusCode).toBe(200);

    const mine = await request(app).get("/api/requests").set(auth(c.token));
    expect(mine.body.pagination.total).toBe(1);
    const theirs = await request(app).get("/api/requests").set(auth(other.token));
    expect(theirs.body.pagination.total).toBe(0);
  });

  it("paginates and filters by status", async () => {
    const c = await registerUser("customer");
    await makeMechanic();
    for (let i = 0; i < 3; i += 1) {
      const id = (await createReq(c.token)).body.data._id;
      await request(app).patch(`/api/requests/${id}/cancel`).set(auth(c.token));
    }
    const page = await request(app).get("/api/requests?limit=2&page=2").set(auth(c.token));
    expect(page.body.data).toHaveLength(1);
    expect(page.body.pagination).toMatchObject({ total: 3, pages: 2 });
    const filtered = await request(app).get("/api/requests?status=matched").set(auth(c.token));
    expect(filtered.body.data).toHaveLength(0);
    expect((await request(app).get("/api/requests?status=bogus").set(auth(c.token))).statusCode).toBe(400);
  });

  it("validates the create payload", async () => {
    const c = await registerUser("customer");
    expect((await createReq(c.token, { problemType: "flying" })).statusCode).toBe(422);
    expect((await createReq(c.token, { location: { lat: 999, lng: 0 } })).statusCode).toBe(422);
    expect((await createReq(c.token, { vehicle: "nope" })).statusCode).toBe(422);
  });

  it("skips mechanics who are busy with another job", async () => {
    const c1 = await registerUser("customer");
    const c2 = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c1.token)).body.data._id;
    await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status: "on_the_way" });
    const second = await createReq(c2.token);
    expect(second.body.data.status).toBe("requested"); // only mechanic is busy
  });
});

describe("Decline → rematch", () => {
  it("re-offers the job to the next mechanic, never back to the decliner", async () => {
    const c = await registerUser("customer");
    const m1 = await makeMechanic();
    const m2 = await makeMechanic({ location: { lat: 19.2, lng: 72.95 } }); // farther away
    const created = await createReq(c.token);
    expect(created.body.data.mechanic.name).toBe(m1.user.name);

    const id = created.body.data._id;
    const dec = await request(app).patch(`/api/requests/${id}/decline`).set(auth(m1.token));
    expect(dec.statusCode).toBe(200);
    expect(dec.body.data.status).toBe("matched");
    expect(dec.body.data.mechanic.name).toBe(m2.user.name);

    // m2 declines too → nobody left → back to requested
    const dec2 = await request(app).patch(`/api/requests/${id}/decline`).set(auth(m2.token));
    expect(dec2.body.data.status).toBe("requested");
    expect(dec2.body.data.mechanic).toBeNull();
  });

  it("only the assigned mechanic can decline", async () => {
    const c = await registerUser("customer");
    await makeMechanic();
    const other = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    const loser = (await request(app).get(`/api/requests/${id}`).set(auth(c.token))).body.data.mechanic._id;
    const stranger = String(loser) === String(other.user.id) ? null : other;
    if (stranger) {
      expect((await request(app).patch(`/api/requests/${id}/decline`).set(auth(stranger.token))).statusCode).toBe(403);
    }
  });
});

describe("Ratings", () => {
  async function completedJob() {
    const c = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    for (const status of ["on_the_way", "arrived", "in_progress", "completed"]) {
      await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status });
    }
    return { c, m, id };
  }

  it("lets the customer rate once and updates the mechanic's average", async () => {
    const { c, m, id } = await completedJob();
    const rate = (rating) => request(app).patch(`/api/requests/${id}/rate`).set(auth(c.token)).send({ rating, review: "Quick!" });

    expect((await rate(6)).statusCode).toBe(422);
    const ok = await rate(3);
    expect(ok.statusCode).toBe(200);
    expect(ok.body.data.rating).toBe(3);
    expect((await User.findById(m.user.id)).rating).toBe(3);
    expect((await rate(5)).statusCode).toBe(409); // only once
  });

  it("refuses to rate an unfinished request", async () => {
    const c = await registerUser("customer");
    await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    const res = await request(app).patch(`/api/requests/${id}/rate`).set(auth(c.token)).send({ rating: 5 });
    expect(res.statusCode).toBe(409);
  });
});

describe("Mechanics API", () => {
  it("lists nearby mechanics without leaking private fields, and respects availability", async () => {
    const c = await registerUser("customer");
    await makeMechanic();
    await makeMechanic({ available: false });
    const res = await request(app)
      .get(`/api/mechanics/nearby?problemType=battery&lat=${MUMBAI.lat}&lng=${MUMBAI.lng}`)
      .set(auth(c.token));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBeUndefined();
    expect(res.body.data[0].distanceKm).toBeGreaterThan(0);
  });

  it("lets a mechanic toggle availability and store location", async () => {
    const m = await registerUser("mechanic", { specialty: "fuel" });
    const res = await request(app)
      .patch("/api/mechanics/availability")
      .set(auth(m.token))
      .send({ available: false, location: { lat: 19.1, lng: 72.9 } });
    expect(res.body.data.available).toBe(false);
    expect(res.body.data.location).toEqual({ lat: 19.1, lng: 72.9 });
  });
});

describe("Admin", () => {
  it("returns platform stats and a paginated user list to admins only", async () => {
    const admin = await registerUser("customer");
    await User.findByIdAndUpdate(admin.user.id, { role: "admin" });
    const adminToken = (await request(app).post("/api/auth/login").send({ email: admin.user.email, password: "password123" })).body.data.token;

    const c = await registerUser("customer");
    const m = await makeMechanic();
    const id = (await createReq(c.token)).body.data._id;
    for (const status of ["on_the_way", "arrived", "in_progress", "completed"]) {
      await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status });
    }

    const stats = await request(app).get("/api/admin/stats").set(auth(adminToken));
    expect(stats.statusCode).toBe(200);
    expect(stats.body.data).toMatchObject({ revenue: 420, completedJobs: 1, mechanicsOnline: 1 });
    expect(stats.body.data.users).toMatchObject({ admin: 1, customer: 1, mechanic: 1 });

    const users = await request(app).get("/api/admin/users?role=mechanic").set(auth(adminToken));
    expect(users.body.data).toHaveLength(1);
    expect(users.body.data[0].password).toBeUndefined();
  });
});

describe("Error handling (Exp 5)", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("reports DB state on /health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body.data.db).toBe("connected");
  });
});
