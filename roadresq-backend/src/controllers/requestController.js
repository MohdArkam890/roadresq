const { body } = require("express-validator");
const Request = require("../models/Request");
const Message = require("../models/Message");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/errorHandler");
const { findAndRankMechanics } = require("../utils/matchMechanic");
const { emitToUser, broadcastRequestUpdate, joinRequestRoom } = require("../sockets/emitter");

const PROBLEMS = ["puncture", "battery", "engine", "fuel", "towing"];

const createRequestRules = [
  body("problemType").isIn(PROBLEMS).withMessage("Invalid problem type"),
  body("location.lat").isFloat({ min: -90, max: 90 }).withMessage("lat must be -90..90"),
  body("location.lng").isFloat({ min: -180, max: 180 }).withMessage("lng must be -180..180"),
  body("vehicle").optional({ values: "falsy" }).isMongoId().withMessage("Invalid vehicle id"),
];

// mechanics can only push a job forward; cancelling is the customer's call
// and un-assigning is /decline — admins may use any legal transition
const MECHANIC_STATUSES = ["on_the_way", "arrived", "in_progress", "completed"];
const updateStatusRules = [body("status").isIn(Request.STATUS_FLOW).withMessage("Invalid status")];

const rateRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be 1..5").toInt(),
  body("review").optional().isString().isLength({ max: 500 }).withMessage("review max 500 chars"),
];

// flat, illustrative pricing — a real system would price by distance/time
const FARE_BY_PROBLEM = { puncture: 350, battery: 420, engine: 650, fuel: 280, towing: 800 };

// every endpoint that returns a request populates the same way, so the
// frontend can always rely on mechanic.name / customer.name being real
// objects rather than sometimes getting back bare ObjectIds
function populateRequest(query) {
  return query
    .populate("mechanic", "name specialty rating phone location")
    .populate("customer", "name phone")
    .populate("vehicle", "name plate type");
}

const loadPopulated = (id) => populateRequest(Request.findById(id));

function isParticipant(request, user) {
  const cid = String(request.customer._id || request.customer);
  const mid = request.mechanic ? String(request.mechanic._id || request.mechanic) : null;
  const uid = String(user._id);
  return user.role === "admin" || cid === uid || mid === uid;
}

// EXPERIMENT 4/6 — creates a request, runs the matching algorithm, and
// assigns the top-ranked mechanic in one step
const createRequest = asyncHandler(async (req, res) => {
  const { problemType, location, vehicle } = req.body;

  const open = await Request.exists({
    customer: req.user._id,
    status: { $in: Request.ACTIVE_STATUSES },
  });
  if (open) throw new AppError("You already have an active request", 409);

  const [best] = await findAndRankMechanics(problemType, location, 1);
  const status = best ? "matched" : "requested";

  const created = await Request.create({
    customer: req.user._id,
    vehicle: vehicle || undefined,
    problemType,
    location,
    mechanic: best ? best._id : null,
    status,
    fare: FARE_BY_PROBLEM[problemType] || 300,
    statusHistory: [{ status }],
  });
  const request = await loadPopulated(created._id);

  // EXPERIMENT 8 — notify the matched mechanic in real time and open the chat room
  const io = req.app.get("io");
  joinRequestRoom(io, request);
  if (best) emitToUser(io, best._id, "request:new", request.toObject());

  res.status(201).json({ success: true, data: request });
});

// EXPERIMENT 5 — pagination + role-based scoping (customers see their
// own requests, mechanics see the ones assigned to them, admins see all)
const listRequests = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  const filter =
    req.user.role === "customer"
      ? { customer: req.user._id }
      : req.user.role === "mechanic"
      ? { mechanic: req.user._id }
      : {};

  if (req.query.status) {
    const wanted = String(req.query.status).split(",");
    if (!wanted.every((s) => Request.STATUS_FLOW.includes(s))) {
      throw new AppError("Invalid status filter", 400);
    }
    filter.status = { $in: wanted };
  }

  const [items, total] = await Promise.all([
    populateRequest(
      Request.find(filter)
        .sort("-createdAt")
        .skip((page - 1) * limit)
        .limit(limit)
    ),
    Request.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getRequest = asyncHandler(async (req, res) => {
  const request = await loadPopulated(req.params.id);
  if (!request) throw new AppError("Request not found", 404);
  if (!isParticipant(request, req.user)) throw new AppError("Forbidden", 403);
  res.json({ success: true, data: request });
});

// EXPERIMENT 8 — advancing status pushes the new state to both the
// customer and the mechanic over their WebSocket connections
const updateStatus = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);

  const isAssignedMechanic = request.mechanic && String(request.mechanic) === String(req.user._id);
  if (!isAssignedMechanic && req.user.role !== "admin") {
    throw new AppError("Only the assigned mechanic can update status", 403);
  }

  const next = req.body.status;
  if (req.user.role === "mechanic" && !MECHANIC_STATUSES.includes(next)) {
    throw new AppError(`Mechanics cannot set status "${next}"`, 403);
  }
  if (!request.canTransitionTo(next)) {
    throw new AppError(`Cannot move a request from "${request.status}" to "${next}"`, 409);
  }

  request.pushStatus(next);
  await request.save();

  const populated = await loadPopulated(request._id);
  broadcastRequestUpdate(req.app.get("io"), populated);
  res.json({ success: true, data: populated });
});

const cancelRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);
  if (String(request.customer) !== String(req.user._id)) throw new AppError("Forbidden", 403);
  if (!request.canTransitionTo("cancelled")) {
    throw new AppError(`A request that is "${request.status}" can no longer be cancelled`, 409);
  }

  request.pushStatus("cancelled");
  await request.save();

  const populated = await loadPopulated(request._id);
  broadcastRequestUpdate(req.app.get("io"), populated);
  res.json({ success: true, data: populated });
});

// a mechanic can turn down a job the matching algorithm just assigned
// them. The request is re-run through matching, skipping everyone who
// has already declined; if nobody is left it falls back to "requested".
const declineRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);

  const isAssignedMechanic = request.mechanic && String(request.mechanic) === String(req.user._id);
  if (!isAssignedMechanic) throw new AppError("Only the assigned mechanic can decline this request", 403);
  if (request.status !== "matched") {
    throw new AppError("Only a newly matched request can be declined", 409);
  }

  request.declinedBy.addToSet(req.user._id);
  const [next] = await findAndRankMechanics(request.problemType, request.location, 1, {
    excludeIds: request.declinedBy,
  });

  request.mechanic = next ? next._id : null;
  if (!next) request.pushStatus("requested");
  else request.statusHistory.push({ status: "matched", at: new Date() });
  await request.save();

  const populated = await loadPopulated(request._id);
  const io = req.app.get("io");
  joinRequestRoom(io, populated);
  broadcastRequestUpdate(io, populated);
  if (next) emitToUser(io, next._id, "request:new", populated.toObject());

  // the decliner's own dashboard just drops the job — tell them explicitly
  emitToUser(io, req.user._id, "request:removed", { id: String(request._id) });
  res.json({ success: true, data: populated });
});

// customers rate a completed job once; the mechanic's headline rating
// is recomputed as the average of all their rated jobs
const rateRequest = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);
  if (String(request.customer) !== String(req.user._id)) throw new AppError("Forbidden", 403);
  if (request.status !== "completed") throw new AppError("Only completed requests can be rated", 409);
  if (request.rating) throw new AppError("This request has already been rated", 409);

  request.rating = req.body.rating;
  if (req.body.review) request.review = req.body.review;
  await request.save();

  if (request.mechanic) {
    const [agg] = await Request.aggregate([
      { $match: { mechanic: request.mechanic, rating: { $exists: true } } },
      { $group: { _id: "$mechanic", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (agg) {
      await User.findByIdAndUpdate(request.mechanic, { rating: Number(agg.avg.toFixed(2)) });
    }
  }

  const populated = await loadPopulated(request._id);
  broadcastRequestUpdate(req.app.get("io"), populated);
  res.json({ success: true, data: populated });
});

// chat history for a request (live messages arrive over the socket)
const listMessages = asyncHandler(async (req, res) => {
  const request = await Request.findById(req.params.id);
  if (!request) throw new AppError("Request not found", 404);
  if (!isParticipant(request, req.user)) throw new AppError("Forbidden", 403);

  const messages = await Message.find({ request: request._id }).sort("createdAt").limit(200);
  res.json({
    success: true,
    data: messages.map((m) => ({
      id: m._id,
      requestId: m.request,
      from: m.sender,
      text: m.text,
      at: m.createdAt,
    })),
  });
});

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  updateStatus,
  cancelRequest,
  declineRequest,
  rateRequest,
  listMessages,
  createRequestRules,
  updateStatusRules,
  rateRules,
  isParticipant,
};
