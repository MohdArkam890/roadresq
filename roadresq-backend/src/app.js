const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const requestRoutes = require("./routes/requestRoutes");
const mechanicRoutes = require("./routes/mechanicRoutes");
const adminRoutes = require("./routes/adminRoutes");

/**
 * EXPERIMENT 5 — production-ready RESTful API
 * ------------------------------------------------
 * app.js only builds the Express app — it never connects to Mongo or
 * calls listen(). That separation is what lets the tests import this
 * file directly and exercise real middleware without an open port.
 */
const app = express();

// behind nginx / Render / Vercel the real client IP arrives in
// X-Forwarded-For — without this every user shares one rate-limit bucket
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");

const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : "*";

app.use(helmet());
app.use(cors({ origin: origins, credentials: origins !== "*" }));
app.use(express.json({ limit: "10kb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// general API rate limit — auth routes layer a tighter one on top
if (process.env.NODE_ENV !== "test") {
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
}

// liveness + readiness in one: container orchestrators and the Docker
// HEALTHCHECK hit this; `db` shows whether Mongo is connected
app.get("/api/health", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      db: dbStates[mongoose.connection.readyState] || "unknown",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/mechanics", mechanicRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
