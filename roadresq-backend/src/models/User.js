const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * EXPERIMENT 4 — Mongoose schema
 * One collection covers all three RoadResQ roles (customer, mechanic,
 * admin); mechanic-only fields simply stay unset for other roles.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["customer", "mechanic", "admin"], default: "customer" },
    // mechanic-only fields
    specialty: {
      type: String,
      enum: ["puncture", "battery", "engine", "fuel", "towing", null],
      default: null,
    },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    available: { type: Boolean, default: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { timestamps: true }
);

// EXPERIMENT 6 groundwork — passwords are always hashed before saving,
// never stored or returned in plain text
userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, email, phone, role, specialty, rating, available, location } = this;
  return { id: _id, name, email, phone, role, specialty, rating, available, location };
};

module.exports = mongoose.model("User", userSchema);
