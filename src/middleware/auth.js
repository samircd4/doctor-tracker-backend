/**
 * middleware/auth.js
 * Protects routes: only requests with a valid login cookie get through.
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
    // Verifies the signature and expiry; payload is { sub: userId, email }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    // Expired or tampered token: clear it so the frontend doesn't keep sending it
    res.clearCookie(COOKIE_NAME, cookieOptions);
    return res.status(401).json({ error: { message: "Session expired, please log in again" } });
  }
}
