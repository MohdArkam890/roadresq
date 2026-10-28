const { haversineKm } = require("./geo");
const User = require("../models/User");
const Request = require("../models/Request");

/**
 * EXPERIMENT 4/5 — the nearest-mechanic algorithm, server-side
 * -------------------------------------------------------------
 * Same weighting as the frontend's useMechanicMatch hook, now backed
 * by real Mongo documents. Split into pure functions (scoreOf,
 * rankMechanics) and a DB-facing wrapper (findAndRankMechanics) so the
 * scoring logic can be unit tested without a database — see
 * tests/matchMechanic.test.js.
 *
 * Weights: distance 35% · rating 25% · specialty 25% · availability 15%
 */
const MAX_RADIUS_KM = 6;

function scoreOf(mechanic, problemType, origin) {
  const distanceKm = haversineKm(origin, mechanic.location);
  const distanceScore = Math.max(0, 1 - distanceKm / MAX_RADIUS_KM);
  const ratingScore = (mechanic.rating ?? 0) / 5;
  const specialtyScore = mechanic.specialty === problemType ? 1 : 0.3;
  const availabilityScore = mechanic.available ? 1 : 0;

  const score =
    distanceScore * 0.35 + ratingScore * 0.25 + specialtyScore * 0.25 + availabilityScore * 0.15;

  return {
    ...mechanic,
    distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null,
    score: Number(score.toFixed(4)),
  };
}

function rankMechanics(mechanics, problemType, origin) {
  return mechanics.map((m) => scoreOf(m, problemType, origin)).sort((a, b) => b.score - a.score);
}

/**
 * Loads mechanics from Mongo and ranks them.
 *  - onlyAvailable: skip mechanics who toggled themselves offline
 *  - excludeIds:    skip mechanics who already declined this job
 * Mechanics currently on a job (on the way / arrived / in progress)
 * are always skipped — one job at a time.
 */
async function findAndRankMechanics(problemType, origin, limit = 5, opts = {}) {
  const { onlyAvailable = true, excludeIds = [] } = opts;

  const busyIds = await Request.distinct("mechanic", {
    status: { $in: Request.BUSY_STATUSES },
    mechanic: { $ne: null },
  });

  const filter = { role: "mechanic", _id: { $nin: [...busyIds, ...excludeIds] } };
  if (onlyAvailable) filter.available = true;

  const mechanics = await User.find(filter).lean();
  return rankMechanics(mechanics, problemType, origin).slice(0, limit);
}

module.exports = { scoreOf, rankMechanics, findAndRankMechanics, MAX_RADIUS_KM };
