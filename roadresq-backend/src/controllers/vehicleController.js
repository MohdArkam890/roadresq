const { body } = require("express-validator");
const Vehicle = require("../models/Vehicle");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/errorHandler");

const vehicleRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("plate").trim().notEmpty().withMessage("Plate is required"),
  body("type").optional().isIn(["Hatchback", "Sedan", "SUV", "Motorcycle"]).withMessage("Invalid type"),
];

const listVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user._id }).sort("-createdAt");
  res.json({ success: true, data: vehicles });
});

// whitelist the fields — never spread req.body into a create() call
// (mass-assignment: a client could otherwise set `owner` themselves)
const addVehicle = asyncHandler(async (req, res) => {
  const { name, plate, type } = req.body;
  const vehicle = await Vehicle.create({ name, plate, type, owner: req.user._id });
  res.status(201).json({ success: true, data: vehicle });
});

const removeVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!vehicle) throw new AppError("Vehicle not found", 404);
  res.json({ success: true, data: { id: req.params.id } });
});

module.exports = { listVehicles, addVehicle, removeVehicle, vehicleRules };
