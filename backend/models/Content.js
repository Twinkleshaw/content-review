const mongoose = require("mongoose");

/*
  STATUS FLOW:
  draft → in_review (Stage 1: Editor) → in_approval (Stage 2: Approver) → published
  Any rejection at any stage → back to draft

  version increments each time content is re-submitted after rejection,
  giving a full audit trail of what changed between cycles.
*/

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    tags: [{ type: String, trim: true }],

    status: {
      type: String,
      enum: ["draft", "in_review", "in_approval", "published", "rejected"],
      default: "draft",
    },

    // Who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Version increments every time content is re-submitted after rejection
    version: { type: Number, default: 1 },

    // Locked once published — no edits allowed
    isLocked: { type: Boolean, default: false },

    // Quick-access: last rejection reason shown to creator
    lastRejectionComment: { type: String, default: null },
    lastRejectedAt: { type: Date, default: null },
    lastRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Timestamps for each stage transition (for display + audit)
    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent editing published content at the model level
contentSchema.pre("save", function (next) {
  if (this.isLocked && !this.isModified("isLocked")) {
    const err = new Error("Published content cannot be modified.");
    err.status = 403;
    return next(err);
  }
  next();
});

module.exports = mongoose.model("Content", contentSchema);
