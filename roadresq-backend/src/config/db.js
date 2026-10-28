const mongoose = require("mongoose");

/**
 * EXPERIMENT 4 — MongoDB + Mongoose integration
 * ------------------------------------------------
 * A single connect function used by server.js. Kept separate from
 * app.js (see src/app.js) so the Express app itself can be imported by
 * tests without ever touching a real database.
 */
async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
