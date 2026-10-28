const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/models/User");

let n = 0;

async function registerUser(role = "customer", extra = {}) {
  n += 1;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: `${role} ${n}`, email: `${role}${n}@test.dev`, password: "password123", role, ...extra });
  return { token: res.body.data.token, user: res.body.data.user, res };
}

// mechanics get a location + specialty directly so matching is deterministic
async function makeMechanic(extra = {}) {
  const m = await registerUser("mechanic", { specialty: "battery" });
  await User.findByIdAndUpdate(m.user.id, { location: { lat: 19.08, lng: 72.88 }, available: true, ...extra });
  return m;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const MUMBAI = { lat: 19.076, lng: 72.8777 };

module.exports = { registerUser, makeMechanic, auth, MUMBAI, app };
