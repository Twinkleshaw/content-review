const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/auth");
const { submitContent, firstStageReview, finalApproval, getAllUsers } = require("../controller/workflow.controller");

// POST /api/workflow/submit/:id — creator submits draft for review
router.post("/submit/:id", authenticate, requireRole("creator"), submitContent);

// POST /api/workflow/review/:id — editor approves or rejects (Stage 1)
router.post("/review/:id", authenticate, requireRole("editor"), firstStageReview);

// POST /api/workflow/approve/:id — approver does final sign-off (Stage 2)
router.post("/approve/:id",authenticate, requireRole("approver"), finalApproval);

// GET /api/workflow/users — returns all users (for role switcher)
router.get("/users", getAllUsers);

module.exports = router;
