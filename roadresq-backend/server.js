require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const initSocket = require("./src/sockets");

const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// fail fast on misconfiguration instead of booting an insecure server
function checkEnv() {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  const weak = process.env.JWT_SECRET.length < 16 || /change_this/i.test(process.env.JWT_SECRET);
  if (weak) {
    if (isProd) console.warn("WARNING: JWT_SECRET looks weak/default — set a long random value in production.");
    else console.warn("JWT_SECRET is a placeholder — fine for local dev only.");
  }
}

const origins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : "*";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: origins } });
initSocket(io);
app.set("io", io); // controllers reach the socket server via req.app.get("io")

async function start() {
  checkEnv();
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(PORT, () => console.log(`RoadResQ API listening on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

// graceful shutdown — `docker stop` / Render redeploys send SIGTERM
function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  io.close();
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();

module.exports = server;
