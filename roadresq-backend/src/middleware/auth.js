const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("./errorHandler");

/**
 * EXPERIMENT 6 — JWT authentication and role-based authorization
 * --------------------------------------------------------------------
 * signToken embeds { id, role } so downstream middleware never has to
 * hit the database just to know a caller's role. protect() verifies
 * the token and attaches the full user document to req.user.
 * authorize(...roles) is a small factory used to gate routes by role
 * (customer / mechanic / admin) — see the route files for usage.
 */
function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Not authenticated", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new AppError("User no longer exists", 401);

    req.user = user;
    next();
  } catch (err) {
    next(new AppError("Not authenticated", 401));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Forbidden — insufficient role", 403));
    }
    next();
  };
}

module.exports = { signToken, protect, authorize };
