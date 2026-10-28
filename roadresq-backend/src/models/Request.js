const mongoose = require("mongoose");

const STATUS_FLOW = [
  "requested",
  "matched",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
];

const ACTIVE_STATUSES = ["requested", "matched", "on_the_way", "arrived", "in_progress"];
// statuses during which a mechanic is physically committed to the job
const BUSY_STATUSES = ["on_the_way", "arrived", "in_progress"];

/**
 * Allowed status transitions (a small state machine).
 * A request can only move forward one step at a time, or be cancelled
 * before work starts. Completed / cancelled are terminal.
 */
const TRANSITIONS = {
  requested: ["matched", "cancelled"],
  matched: ["on_the_way", "requested", "cancelled"],
  on_the_way: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

/**
 * EXPERIMENT 4 — the core RoadResQ document
 * A breakdown request, with an embedded statusHistory so every
 * transition (used by Experiment 8's real-time updates) is auditable.
 */
const requestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // mechanics who turned this job down — never re-offered to them
    declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    problemType: {
      type: String,
      enum: ["puncture", "battery", "engine", "fuel", "towing"],
      required: true,
    },
    status: { type: String, enum: STATUS_FLOW, default: "requested", index: true },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
    },
    fare: { type: Number, default: 0 },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 500 },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: STATUS_FLOW },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

requestSchema.methods.pushStatus = function pushStatus(status) {
  this.status = status;
  this.statusHistory.push({ status, at: new Date() });
};

requestSchema.methods.canTransitionTo = function canTransitionTo(next) {
  return (TRANSITIONS[this.status] || []).includes(next);
};

requestSchema.statics.STATUS_FLOW = STATUS_FLOW;
requestSchema.statics.ACTIVE_STATUSES = ACTIVE_STATUSES;
requestSchema.statics.BUSY_STATUSES = BUSY_STATUSES;
requestSchema.statics.TRANSITIONS = TRANSITIONS;

module.exports = mongoose.model("Request", requestSchema);
