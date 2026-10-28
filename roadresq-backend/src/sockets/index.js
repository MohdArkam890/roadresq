const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Request = require("../models/Request");
const Message = require("../models/Message");
const { isParticipant } = require("../controllers/requestController");

/**
 * EXPERIMENT 8 — WebSockets (Socket.IO)
 * ----------------------------------------
 * Every socket connection authenticates with the same JWT used for the
 * REST API, then joins a personal room (user:<id>) so the server can
 * push direct events:
 *
 *   request:new      → a mechanic was just matched to a job
 *   request:update   → status of a request changed (customer + mechanic)
 *   request:removed  → a mechanic's job was re-assigned elsewhere
 *
 * Chat and live tracking run through a per-request room (request:<id>).
 * Joining that room is authorised against the database — only the
 * request's customer, its assigned mechanic, or an admin can enter, so
 * nobody can eavesdrop on another job by guessing an id.
 *
 *   chat:message     client → server → everyone in the room (persisted)
 *   mechanic:location mechanic → server → customer (live tracking)
 */
const MAX_MESSAGE_LENGTH = 500;

async function authorizeRoom(userId, requestId) {
  if (!requestId || !/^[a-f\d]{24}$/i.test(String(requestId))) return null;
  const [user, request] = await Promise.all([User.findById(userId), Request.findById(requestId)]);
  if (!user || !request) return null;
  return isParticipant(request, user) ? { user, request } : null;
}

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authenticated"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = String(decoded.id);
      socket.role = decoded.role;
      next();
    } catch (err) {
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    // on (re)connect, drop the client back into rooms for any live job
    // so chat keeps working after a refresh or a network blip
    Request.find({
      $or: [{ customer: socket.userId }, { mechanic: socket.userId }],
      status: { $in: Request.ACTIVE_STATUSES },
    })
      .select("_id")
      .then((jobs) => jobs.forEach((j) => socket.join(`request:${j._id}`)))
      .catch(() => {});

    socket.on("request:join", async (requestId, ack) => {
      const ok = await authorizeRoom(socket.userId, requestId);
      if (ok) socket.join(`request:${requestId}`);
      if (typeof ack === "function") ack({ ok: Boolean(ok) });
    });

    socket.on("request:leave", (requestId) => {
      socket.leave(`request:${requestId}`);
    });

    socket.on("chat:message", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const { requestId } = payload || {};
        const text = String(payload?.text || "").trim();
        if (!text || text.length > MAX_MESSAGE_LENGTH) return reply({ ok: false, error: "Invalid message" });

        const ctx = await authorizeRoom(socket.userId, requestId);
        if (!ctx) return reply({ ok: false, error: "Forbidden" });
        if (!["customer", "mechanic"].includes(ctx.user.role)) return reply({ ok: false, error: "Forbidden" });
        if (!ctx.request.mechanic) return reply({ ok: false, error: "No mechanic assigned yet" });
        if (["completed", "cancelled"].includes(ctx.request.status)) {
          return reply({ ok: false, error: "This request is closed" });
        }

        const saved = await Message.create({ request: requestId, sender: socket.userId, text });
        const message = {
          id: String(saved._id),
          requestId: String(requestId),
          from: socket.userId,
          text: saved.text,
          at: saved.createdAt.toISOString(),
        };
        socket.join(`request:${requestId}`);
        io.to(`request:${requestId}`).emit("chat:message", message);
        reply({ ok: true, message });
      } catch (err) {
        reply({ ok: false, error: "Could not send message" });
      }
    });

    // live tracking — only the assigned mechanic may broadcast a position,
    // and it is relayed to the customer of that same request
    socket.on("mechanic:location", async (payload) => {
      try {
        const { requestId, lat, lng } = payload || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

        const request = await Request.findById(requestId);
        if (!request || String(request.mechanic) !== socket.userId) return;
        if (!["on_the_way", "arrived", "in_progress"].includes(request.status)) return;

        await User.findByIdAndUpdate(socket.userId, { location: { lat, lng } });
        io.to(`user:${request.customer}`).emit("mechanic:location", {
          requestId: String(request._id),
          lat,
          lng,
          at: new Date().toISOString(),
        });
      } catch (err) {
        // location pings are best-effort; never crash the socket over one
      }
    });
  });
}

module.exports = initSocket;
