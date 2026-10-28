const { query, body } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { findAndRankMechanics } = require("../utils/matchMechanic");

const nearbyRules = [
  query("problemType").isIn(["puncture", "battery", "engine", "fuel", "towing"]),
  query("lat").isFloat({ min: -90, max: 90 }),
  query("lng").isFloat({ min: -180, max: 180 }),
];

const availabilityRules = [
  body("available").isBoolean().withMessage("available must be true or false").toBoolean(),
  body("location.lat").optional().isFloat({ min: -90, max: 90 }),
  body("location.lng").optional().isFloat({ min: -180, max: 180 }),
];

// same filters as the real assignment (available, not busy), so the
// "best match" preview a customer sees is the mechanic they'll get
const nearby = asyncHandler(async (req, res) => {
  const { problemType, lat, lng } = req.query;
  const ranked = await findAndRankMechanics(problemType, { lat: Number(lat), lng: Number(lng) }, 5);
  // never expose contact data or internals from the public-ish listing
  const data = ranked.map(({ _id, name, specialty, rating, distanceKm, score }) => ({
    _id,
    name,
    specialty,
    rating,
    distanceKm,
    score,
  }));
  res.json({ success: true, data });
});

const setAvailability = asyncHandler(async (req, res) => {
  const update = { available: req.body.available };
  if (req.body.location) update.location = req.body.location;

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  res.json({ success: true, data: user.toSafeObject() });
});

module.exports = { nearby, setAvailability, nearbyRules, availabilityRules };
