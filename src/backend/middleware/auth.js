const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware: Verify JWT token and attach user to request.
 * Automatically ensures req.user has both `roles` array and backward-compatible `role`.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ error: "Authentication required. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      return res
        .status(401)
        .json({ error: "User account not found. Please log in again." });
    }

    // Ensure roles array exists and role fallback exists
    if (!Array.isArray(user.roles) || user.roles.length === 0) {
      user.roles = [user.role || "donor"];
    }
    user.role = user.roles[0];
    user.id = user._id;

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
}

/**
 * Middleware factory: Require at least one matching role from allowedRoles.
 * Supports both multi-role accounts (roles: ["patient", "donor"]) and legacy single role.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const userRoles =
      Array.isArray(req.user.roles) && req.user.roles.length > 0
        ? req.user.roles
        : [req.user.role || "donor"];

    const hasRole = allowedRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}.`,
      });
    }
    next();
  };
}

/**
 * Generate a signed JWT for a user.
 */
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

module.exports = { authenticateToken, requireRole, generateToken };
