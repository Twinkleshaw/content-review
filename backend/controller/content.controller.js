const Content = require("../models/Content");
const ReviewAction = require("../models/ReviewAction");

exports.listAllContent = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const contents = await Content.find(filter)
            .populate("createdBy", "name role")
            .populate("lastRejectedBy", "name role")
            .sort({ updatedAt: -1 });

        res.json(contents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.contentById = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id)
            .populate("createdBy", "name role email")
            .populate("lastRejectedBy", "name role");

        if (!content) return res.status(404).json({ error: "Content not found." });

        // Attach review history
        const history = await ReviewAction.find({ content: content._id })
            .populate("reviewer", "name role")
            .sort({ actedAt: 1 });

        res.json({ content, history });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.createContent = async (req, res) => {
    try {
        const { title, body, tags } = req.body;

        if (!title?.trim()) return res.status(400).json({ error: "Title is required." });
        if (!body?.trim()) return res.status(400).json({ error: "Body is required." });

        const content = await Content.create({
            title: title.trim(),
            body: body.trim(),
            tags: tags || [],
            createdBy: req.currentUser._id,
            status: "draft",
        });

        await content.populate("createdBy", "name role");
        res.status(201).json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.editContent = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content) return res.status(404).json({ error: "Content not found." });

        // Only the original creator can edit
        if (content.createdBy.toString() !== req.currentUser._id.toString()) {
            return res.status(403).json({ error: "You can only edit your own content." });
        }

        // Can only edit when in draft state
        if (content.status !== "draft") {
            return res.status(403).json({
                error: `Content cannot be edited in "${content.status}" status. Only drafts are editable.`,
            });
        }

        if (content.isLocked) {
            return res.status(403).json({ error: "Published content cannot be edited." });
        }

        const { title, body, tags } = req.body;
        if (title) content.title = title.trim();
        if (body) content.body = body.trim();
        if (tags !== undefined) content.tags = tags;

        await content.save();
        await content.populate("createdBy", "name role");
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

exports.deleteContent = async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content) return res.status(404).json({ error: "Content not found." });

        if (content.createdBy.toString() !== req.currentUser._id.toString()) {
            return res.status(403).json({ error: "You can only delete your own content." });
        }

        if (content.status !== "draft") {
            return res.status(403).json({ error: "Only draft content can be deleted." });
        }

        await content.deleteOne();
        res.json({ message: "Content deleted." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}