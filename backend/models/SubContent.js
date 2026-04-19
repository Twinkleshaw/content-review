const mongoose = require("mongoose");

/*
  SUB-CONTENT DESIGN:
  - Sub-content belongs to a parent Content item
  - It has its own independent 2-stage review workflow (same states as Content)
  - Parent content cannot be submitted for review until ALL sub-content
    items are either published or there are none attached
  - Sub-content can be created/edited/deleted by the parent content's creator
  - Sub-content is reviewed by the same editor/approver roles
  - Rejecting sub-content does NOT reject the parent — they are independent
  - But blocking submission enforces the dependency at the right moment

  WHY this design:
  Loose coupling during review (sub-content reviewed independently) but
  tight coupling at submit time (parent can't proceed with unreviewed children)
  gives reviewers flexibility while maintaining content integrity.
*/

const subContentSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },

    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["section", "attachment", "note", "reference"],
      default: "section",
    },

    status: {
      type: String,
      enum: ["draft", "in_review", "in_approval", "published", "rejected"],
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    version: { type: Number, default: 1 },
    isLocked: { type: Boolean, default: false },

    lastRejectionComment: { type: String, default: null },
    lastRejectedAt: { type: Date, default: null },
    lastRejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Same lock enforcement as parent Content
subContentSchema.pre("save", function (next) {
  // Allow the moment when we are locking (transition to published)
  if (this.isLocked && !this.isModified("isLocked")) {
    return next(new Error("Published sub-content cannot be modified."));
  }

  next();
});

module.exports = mongoose.model("SubContent", subContentSchema);
