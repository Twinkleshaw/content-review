const Content = require("../models/Content");
const ReviewAction = require("../models/ReviewAction");
const SubContent = require("../models/SubContent");

exports.submitContent = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id).populate("createdBy", "name role");
        if (!content) return res.status(404).json({ error: "Content not found." });

        if (content.createdBy._id.toString() !== req.currentUser._id.toString()) {
            return res.status(403).json({ error: "You can only submit your own content." });
        }

        if (content.status !== "draft") {
            return res.status(400).json({
                error: `Cannot submit. ${blockers.length} sub-content item(s) must be fully approved (published) first.`,
            });
        }

        // Gate: all sub-content must be published (or there must be none)
        const subItems = await SubContent.find({ parent: content._id });
        const blockers = subItems.filter((s) => s.status !== "published");
        if (blockers.length > 0) {
            const details = blockers.map((s) => `"${s.title}" (${s.status})`).join(", ");
            return res.status(400).json({
                error: `Cannot submit. ${blockers.length} sub-content item${blockers.length > 1 ? "s" : ""} must be submitted for review first: ${details}`,
                blockers: blockers.map((s) => ({ id: s._id, title: s.title, status: s.status })),
            });
        }

        content.status = "in_review";
        content.submittedAt = new Date();
        content.lastRejectionComment = null; // clear previous rejection
        await content.save();

        res.json({ message: "Content submitted for Stage 1 review.", content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.firstStageReview = async (req, res) => {
    try {
        const { action, comment } = req.body;

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
        }

        if (action === "reject" && !comment?.trim()) {
            return res.status(400).json({ error: "A comment is required when rejecting content." });
        }

        const content = await Content.findById(req.params.id).populate("createdBy", "name role");
        if (!content) return res.status(404).json({ error: "Content not found." });

        if (content.status !== "in_review") {
            return res.status(400).json({
                error: `Cannot review. Content is "${content.status}", expected "in_review".`,
            });
        }

        // Prevent self-approval (editor who is also the creator)
        if (content.createdBy._id.toString() === req.currentUser._id.toString()) {
            return res.status(403).json({ error: "You cannot review your own content." });
        }

        // Record the action
        await ReviewAction.create({
            content: content._id,
            stage: "stage1",
            action,
            reviewer: req.currentUser._id,
            comment: comment?.trim() || "",
            version: content.version,
        });

        if (action === "approve") {
            content.status = "in_approval";
        } else {
            // Rejection: back to draft, version bumped, creator must re-edit & re-submit
            content.status = "draft";
            content.version += 1;
            content.lastRejectionComment = comment.trim();
            content.lastRejectedAt = new Date();
            content.lastRejectedBy = req.currentUser._id;
        }

        await content.save();

        const msg =
            action === "approve"
                ? "Content approved at Stage 1. Moved to final approval."
                : "Content rejected at Stage 1. Returned to creator as draft.";

        res.json({ message: msg, content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.finalApproval = async (req, res) => {
    try {
        const { action, comment } = req.body;

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
        }

        if (action === "reject" && !comment?.trim()) {
            return res.status(400).json({ error: "A comment is required when rejecting content." });
        }

        const content = await Content.findById(req.params.id).populate("createdBy", "name role");
        if (!content) return res.status(404).json({ error: "Content not found." });

        if (content.status !== "in_approval") {
            return res.status(400).json({
                error: `Cannot approve. Content is "${content.status}", expected "in_approval".`,
            });
        }

        // Prevent self-approval
        if (content.createdBy._id.toString() === req.currentUser._id.toString()) {
            return res.status(403).json({ error: "You cannot approve your own content." });
        }

        // Record the action
        await ReviewAction.create({
            content: content._id,
            stage: "stage2",
            action,
            reviewer: req.currentUser._id,
            comment: comment?.trim() || "",
            version: content.version,
        });

        if (action === "approve") {
            content.status = "published";
            content.isLocked = true;
            content.publishedAt = new Date();
        } else {
            // Rejected at Stage 2 — restart from the very beginning
            content.status = "draft";
            content.version += 1;
            content.lastRejectionComment = comment.trim();
            content.lastRejectedAt = new Date();
            content.lastRejectedBy = req.currentUser._id;
        }

        await content.save();

        const msg =
            action === "approve"
                ? "Content fully approved and published."
                : "Content rejected at Stage 2. Returned to creator. Must restart approval from Stage 1.";

        res.json({ message: msg, content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const User = require("../models/User");
        const users = await User.find().select("name email role");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}