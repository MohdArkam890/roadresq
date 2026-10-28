const express = require("express");
const rateLimit = require("express-rate-limit");
const { register, login, me, registerRules, loginRules } = require("../controllers/authController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");

const router = express.Router();

// EXPERIMENT 5 — tighter rate limit on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts, please try again later" },
  // the integration suite creates dozens of users; tests/rateLimit.test.js
  // opts back in with TEST_RATE_LIMIT=1 to prove the limiter itself works
  skip: () => process.env.NODE_ENV === "test" && !process.env.TEST_RATE_LIMIT,
});

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.get("/me", protect, me);

module.exports = router;
