const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    plate: { type: String, required: true, trim: true, uppercase: true },
    type: {
      type: String,
      enum: ["Hatchback", "Sedan", "SUV", "Motorcycle"],
      default: "Hatchback",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
