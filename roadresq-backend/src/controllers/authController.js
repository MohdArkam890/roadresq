const { body } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { signToken } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("role").optional().isIn(["customer", "mechanic"]).withMessage("Invalid role"),
  body("specialty")
    .optional({ values: "falsy" })
    .isIn(["puncture", "battery", "engine", "fuel", "towing"])
    .withMessage("Invalid specialty"),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, specialty } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already registered", 409);

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || "customer",
    specialty: role === "mechanic" ? specialty : undefined,
  });

  const token = signToken(user);
  res.status(201).json({ success: true, data: { user: user.toSafeObject(), token } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signToken(user);
  res.json({ success: true, data: { user: user.toSafeObject(), token } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});

module.exports = { register, login, me, registerRules, loginRules };
