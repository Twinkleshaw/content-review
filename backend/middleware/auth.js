const User = require("../models/User");

/*
  Instead of JWT, the frontend sends the selected user's ID in the
  X-User-Id header (set by the role switcher). This middleware
  validates it and attaches req.currentUser to every request.

  In production you'd replace this with JWT verification —
  the rest of the codebase wouldn't change at all.
*/

const authenticate = async (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "No user selected. Please choose a role." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "Invalid user." });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid user ID format." });
  }
};

// Role-specific guards — used as middleware in routes
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.currentUser.role}.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
