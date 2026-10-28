const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  nearby,
  setAvailability,
  nearbyRules,
  availabilityRules,
} = require("../controllers/mechanicController");

const router = express.Router();

router.get("/nearby", protect, nearbyRules, validate, nearby);
router.patch("/availability", protect, authorize("mechanic"), availabilityRules, validate, setAvailability);

module.exports = router;
