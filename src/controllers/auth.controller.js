/**
 * controllers/auth.controller.js
 * Login, logout and "who am I" for the admin portal.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { COOKIE_NAME, cookieOptions } from "../middleware/auth.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;

  // Password is `select: false` in the model, so ask for it explicitly here
  const user = await User.findOne({ email }).select("+password").lean();
  const passwordOk = user && (await bcrypt.compare(password, user.password));

  // Same message for "no such user" and "wrong password" so attackers can't probe emails
  if (!passwordOk) {
    return res.status(401).json({ error: { message: "Invalid email or password" } });
  }

  const token = jwt.sign({ sub: String(user._id), email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  // Token lives in an httpOnly cookie, never in localStorage
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_DAY_MS });
  res.json({ data: { _id: user._id, name: user.name, email: user.email } });
}

// POST /api/auth/logout
export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
}

// GET /api/auth/me  (protected)
export async function me(req, res) {
  const user = await User.findById(req.user.sub).lean();
  if (!user) {
    return res.status(401).json({ error: { message: "User no longer exists" } });
  }
  res.json({ data: { _id: user._id, name: user.name, email: user.email } });
}
