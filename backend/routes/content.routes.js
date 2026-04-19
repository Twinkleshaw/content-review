const express = require("express");
const router = express.Router();
const { listAllContent, contentById, createContent, editContent, deleteContent } = require("../controller/content.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// GET /api/contents — list all content (with filters)
router.get("/", listAllContent);

// GET /api/contents/:id — single content with full review history
router.get("/:id", contentById);

// POST /api/contents — create new content (creator only)
router.post("/", requireRole("creator"), createContent);

// PUT /api/contents/:id — edit content (creator only, only when draft/rejected)
router.put("/:id", requireRole("creator"), editContent);

// DELETE /api/contents/:id — delete draft only (creator only)
router.delete("/:id", requireRole("creator"), deleteContent);

module.exports = router;
