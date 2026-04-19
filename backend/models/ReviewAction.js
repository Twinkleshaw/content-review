const mongoose = require("mongoose");

/*
  Every approve/reject action is recorded here permanently.
  Even when content is rejected and re-submitted, old actions are kept.
  The `version` field ties each action to the submission cycle it belongs to.
  This gives a full history: v1 rejected by editor, v2 rejected by approver, v3 published.
*/

const reviewActionSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },

    // Which stage this action was taken at
    stage: {
      type: String,
      enum: ["stage1", "stage2"],
      required: true,
    },

    action: {
      type: String,
      enum: ["approve", "reject"],
      required: true,
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    comment: {
      type: String,
      default: "",
      // Required on reject (enforced in route, not schema — better error messages)
    },

    // Which submission cycle this belongs to
    version: { type: Number, required: true },

    actedAt: { type: Date, default: Date.now },

    isSubContent: { type: Boolean, default: false },

  },
  { timestamps: false }
);

module.exports = mongoose.model("ReviewAction", reviewActionSchema);
