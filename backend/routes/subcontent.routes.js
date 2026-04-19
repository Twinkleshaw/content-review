const express = require("express");
const router = express.Router({ mergeParams: true }); // gets :contentId from parent route
const SubContent = require("../models/SubContent");
const Content = require("../models/Content");
const ReviewAction = require("../models/ReviewAction");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

// Helper: verify parent content exists
async function getParent(contentId, res) {
  const parent = await Content.findById(contentId);
  if (!parent) {
    res.status(404).json({ error: "Parent content not found." });
    return null;
  }
  return parent;
}

// GET /api/contents/:contentId/subcontent
// List all sub-content for a parent
router.get("/", async (req, res) => {
  try {
    const parent = await getParent(req.params.contentId, res);
    if (!parent) return;

    const items = await SubContent.find({ parent: parent._id })
      .populate("createdBy", "name role")
      .populate("lastRejectedBy", "name role")
      .sort({ createdAt: 1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contents/:contentId/subcontent/:id
// Single sub-content with its review history
router.get("/:id", async (req, res) => {
  try {
    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    })
      .populate("createdBy", "name role")
      .populate("lastRejectedBy", "name role");

    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    const history = await ReviewAction.find({
      content: item._id,
      isSubContent: true,
    })
      .populate("reviewer", "name role")
      .sort({ actedAt: 1 });

    res.json({ subContent: item, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contents/:contentId/subcontent
// Create sub-content (creator only, parent must not be published)
router.post("/", requireRole("creator"), async (req, res) => {
  try {
    const parent = await getParent(req.params.contentId, res);
    if (!parent) return;

    if (parent.isLocked) {
      return res.status(403).json({
        error: "Cannot add sub-content to a published parent.",
      });
    }

    const { title, body, type } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
    if (!body?.trim()) return res.status(400).json({ error: "Body is required." });

    // Only the parent's creator can add sub-content
    if (parent.createdBy.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: "Only the content creator can add sub-content." });
    }

    const item = await SubContent.create({
      parent: parent._id,
      title: title.trim(),
      body: body.trim(),
      type: type || "section",
      createdBy: req.currentUser._id,
    });

    await item.populate("createdBy", "name role");
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contents/:contentId/subcontent/:id
// Edit sub-content (creator only, draft state only)
router.put("/:id", requireRole("creator"), async (req, res) => {
  try {
    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    });
    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    if (item.createdBy.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own sub-content." });
    }

    if (item.status !== "draft") {
      return res.status(403).json({
        error: `Sub-content cannot be edited in "${item.status}" status.`,
      });
    }

    if (item.isLocked) {
      return res.status(403).json({ error: "Published sub-content cannot be edited." });
    }

    const { title, body, type } = req.body;
    if (title) item.title = title.trim();
    if (body) item.body = body.trim();
    if (type) item.type = type;

    await item.save();
    await item.populate("createdBy", "name role");
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contents/:contentId/subcontent/:id
// Delete sub-content (draft only)
router.delete("/:id", requireRole("creator"), async (req, res) => {
  try {
    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    });
    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    if (item.createdBy.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own sub-content." });
    }

    if (item.status !== "draft") {
      return res.status(403).json({ error: "Only draft sub-content can be deleted." });
    }

    await item.deleteOne();
    res.json({ message: "Sub-content deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WORKFLOW ─────────────────────────────────────────────────────────────────

// POST /api/contents/:contentId/subcontent/:id/submit
router.post("/:id/submit", requireRole("creator"), async (req, res) => {
  try {
    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    });
    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    if (item.createdBy.toString() !== req.currentUser._id.toString()) {
      return res.status(403).json({ error: "You can only submit your own sub-content." });
    }

    if (item.status !== "draft") {
      return res.status(400).json({
        error: `Cannot submit. Sub-content is "${item.status}".`,
      });
    }

    item.status = "in_review";
    item.submittedAt = new Date();
    item.lastRejectionComment = null;
    await item.save();

    res.json({ message: "Sub-content submitted for Stage 1 review.", subContent: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contents/:contentId/subcontent/:id/review
// Stage 1 — editor
router.post("/:id/review", requireRole("editor"), async (req, res) => {
  try {
    const { action, comment } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
    }
    if (action === "reject" && !comment?.trim()) {
      return res.status(400).json({ error: "Comment is required when rejecting." });
    }

    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    }).populate("createdBy");

    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    if (item.status !== "in_review") {
      return res.status(400).json({ error: `Cannot review. Status is "${item.status}".` });
    }

    if (item.createdBy._id.toString() === req.currentUser._id.toString()) {
      return res.status(403).json({ error: "You cannot review your own sub-content." });
    }

    await ReviewAction.create({
      content: item._id,
      stage: "stage1",
      action,
      reviewer: req.currentUser._id,
      comment: comment?.trim() || "",
      version: item.version,
      isSubContent: true,
    });

    if (action === "approve") {
      item.status = "in_approval";
    } else {
      item.status = "draft";
      item.version += 1;
      item.lastRejectionComment = comment.trim();
      item.lastRejectedAt = new Date();
      item.lastRejectedBy = req.currentUser._id;
    }

    await item.save();
    res.json({
      message: action === "approve"
        ? "Sub-content approved at Stage 1."
        : "Sub-content rejected. Returned to creator.",
      subContent: item,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contents/:contentId/subcontent/:id/approve
// Stage 2 — approver
router.post("/:id/approve", requireRole("approver"), async (req, res) => {
  try {
    const { action, comment } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
    }
    if (action === "reject" && !comment?.trim()) {
      return res.status(400).json({ error: "Comment is required when rejecting." });
    }

    const item = await SubContent.findOne({
      _id: req.params.id,
      parent: req.params.contentId,
    }).populate("createdBy");

    if (!item) return res.status(404).json({ error: "Sub-content not found." });

    if (item.status !== "in_approval") {
      return res.status(400).json({ error: `Cannot approve. Status is "${item.status}".` });
    }

    if (item.createdBy._id.toString() === req.currentUser._id.toString()) {
      return res.status(403).json({ error: "You cannot approve your own sub-content." });
    }

    await ReviewAction.create({
      content: item._id,
      stage: "stage2",
      action,
      reviewer: req.currentUser._id,
      comment: comment?.trim() || "",
      version: item.version,
      isSubContent: true,
    });

    if (action === "approve") {
      item.status = "published";
      item.isLocked = true;
      item.publishedAt = new Date();
    } else {
      item.status = "draft";
      item.version += 1;
      item.lastRejectionComment = comment.trim();
      item.lastRejectedAt = new Date();
      item.lastRejectedBy = req.currentUser._id;
    }

    await item.save();
    res.json({
      message: action === "approve"
        ? "Sub-content fully approved and published."
        : "Sub-content rejected at Stage 2. Returned to creator.",
      subContent: item,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
