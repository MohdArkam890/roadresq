const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = validate;
const { listVehicles, addVehicle, removeVehicle, vehicleRules } = require("../controllers/vehicleController");

const router = express.Router();

router.use(protect, authorize("customer"));
router.get("/", listVehicles);
router.post("/", vehicleRules, validate, addVehicle);
router.delete("/:id", idParam, validate, removeVehicle);

module.exports = router;
