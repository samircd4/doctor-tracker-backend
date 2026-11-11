/**
 * middleware/auth.js
 * Authentication (requireAuth): only requests with a valid login cookie get through.
 * Authorization (requireRole): only users with an allowed role may continue.
 */
import jwt from "jsonwebtoken";

export const COOKIE_NAME = "token";

// Cookie settings shared by login (set) and logout (clear) — they must match to clear it
export const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read it (protects against XSS)
  sameSite: "lax", // not sent on cross-site requests (protects against CSRF)
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  path: "/",
};

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: { message: "Please log in" } });
  }

  try {
    // Verifies the signature and expiry; payload is { sub: userId, email, role }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    // Expired or tampered token: clear it so the frontend doesn't keep sending it
    res.clearCookie(COOKIE_NAME, cookieOptions);
    return res.status(401).json({ error: { message: "Session expired, please log in again" } });
  }
}

/**
 * Authorization: allow only the given roles. Use after requireAuth.
 * Example: router.post("/", requireRole("admin"), createDoctor)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Tokens issued before roles existed have no role: ask the user to log in again
    if (!req.user?.role) {
      res.clearCookie(COOKIE_NAME, cookieOptions);
      return res.status(401).json({ error: { message: "Session expired, please log in again" } });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: "You don't have permission to do this" } });
    }
    next();
  };
}
