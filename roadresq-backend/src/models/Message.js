const mongoose = require("mongoose");

/**
 * EXPERIMENT 8 — persisted chat message
 * Messages travel over the WebSocket for instant delivery but are also
 * stored, so a reconnecting client (or a page refresh) can load the
 * conversation history over REST.
 */
const messageSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Message", messageSchema);
