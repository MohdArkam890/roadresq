const Request = require("../models/Request");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

/**
 * EXPERIMENT 6 — the third role. Everything here is mounted behind
 * authorize("admin"), so it doubles as the proof that role checks
 * work: a customer or mechanic token gets 403 on every route.
 */
const stats = asyncHandler(async (req, res) => {
  const [usersByRole, requestsByStatus, revenue, mechanicsOnline] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Request.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Request.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$fare" }, jobs: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: "mechanic", available: true }),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  res.json({
    success: true,
    data: {
      users: toMap(usersByRole),
      requests: toMap(requestsByStatus),
      mechanicsOnline,
      revenue: revenue[0]?.total || 0,
      completedJobs: revenue[0]?.jobs || 0,
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = ["customer", "mechanic", "admin"].includes(req.query.role) ? { role: req.query.role } : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users.map((u) => u.toSafeObject()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = { stats, listUsers };
