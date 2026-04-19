const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["creator", "editor", "approver"],
      required: true,
    },
    avatar: { type: String }, // initials-based, generated on seed
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
