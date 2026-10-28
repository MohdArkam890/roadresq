/**
 * Seeds demo data so the app is usable straight away:
 *   - 1 admin, 1 customer (with two vehicles), 6 mechanics around Mumbai
 *
 * Usage:   npm run seed            (idempotent — skips users that exist)
 *          npm run seed -- --reset (wipes users, vehicles, requests, messages first)
 *
 * All demo accounts share the password below — dev/demo only.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Vehicle = require("../src/models/Vehicle");
const Request = require("../src/models/Request");
const Message = require("../src/models/Message");

const PASSWORD = "Password@123";

const USERS = [
  { name: "Admin User", email: "admin@roadresq.dev", role: "admin", phone: "+91 90000 00000" },
  { name: "Jordan Fernandes", email: "customer@roadresq.dev", role: "customer", phone: "+91 98765 43210" },
  { name: "Vikram Rao", email: "vikram@roadresq.dev", role: "mechanic", specialty: "battery", rating: 4.9, location: { lat: 19.0822, lng: 72.8812 } },
  { name: "Ayesha Khan", email: "ayesha@roadresq.dev", role: "mechanic", specialty: "puncture", rating: 4.8, location: { lat: 19.0861, lng: 72.8697 } },
  { name: "Suresh Patil", email: "suresh@roadresq.dev", role: "mechanic", specialty: "engine", rating: 4.7, location: { lat: 19.0950, lng: 72.8900 } },
  { name: "Karan Mehta", email: "karan@roadresq.dev", role: "mechanic", specialty: "fuel", rating: 4.5, location: { lat: 19.1100, lng: 72.8600 } },
  { name: "Neha Joshi", email: "neha@roadresq.dev", role: "mechanic", specialty: "puncture", rating: 4.6, location: { lat: 19.0790, lng: 72.8850 } },
  { name: "Farhan Ali", email: "farhan@roadresq.dev", role: "mechanic", specialty: "towing", rating: 4.9, location: { lat: 19.1250, lng: 72.9000 } },
];

async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), Request.deleteMany({}), Message.deleteMany({})]);
    console.log("Cleared existing data.");
  }

  let created = 0;
  for (const u of USERS) {
    if (await User.exists({ email: u.email })) continue;
    await User.create({ ...u, password: PASSWORD });
    created += 1;
  }

  const customer = await User.findOne({ email: "customer@roadresq.dev" });
  if (customer && !(await Vehicle.exists({ owner: customer._id }))) {
    await Vehicle.create([
      { owner: customer._id, name: "Honda City", plate: "MH 02 AB 1234", type: "Sedan" },
      { owner: customer._id, name: "Royal Enfield Classic", plate: "MH 04 XY 9876", type: "Motorcycle" },
    ]);
  }

  console.log(`Seed complete — ${created} new user(s). Demo password for all accounts: ${PASSWORD}`);
}

module.exports = seed;

if (require.main === module) {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => seed({ reset: process.argv.includes("--reset") }))
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error("Seed failed:", err.message);
      process.exit(1);
    });
}
