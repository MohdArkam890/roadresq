/**
 * EXPERIMENT 8 — small helpers controllers use to push real-time events.
 * Every helper no-ops when `io` is undefined, so controllers (and the
 * test suite) work identically with or without a socket server attached.
 */
const idOf = (x) => (x && x._id ? String(x._id) : x ? String(x) : null);

function emitToUser(io, userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

// push the latest version of a request to both people involved
function broadcastRequestUpdate(io, request) {
  if (!io) return;
  const payload = typeof request.toObject === "function" ? request.toObject() : request;
  emitToUser(io, idOf(request.customer), "request:update", payload);
  emitToUser(io, idOf(request.mechanic), "request:update", payload);
}

// put both participants' live sockets into the request's chat room
function joinRequestRoom(io, request) {
  if (!io) return;
  const room = `request:${idOf(request)}`;
  [idOf(request.customer), idOf(request.mechanic)].filter(Boolean).forEach((uid) => {
    io.in(`user:${uid}`).socketsJoin(room);
  });
}

module.exports = { emitToUser, broadcastRequestUpdate, joinRequestRoom, idOf };
