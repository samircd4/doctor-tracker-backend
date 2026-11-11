/**
 * models/User.js
 * Admin users who can log in to the portal.
 */
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // `unique` also creates an index, so login lookups by email are fast
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Hidden by default so the hash is never sent in API responses by accident
    password: { type: String, required: true, select: false },
    // Authorization: "admin" can create/edit/delete, "staff" can only view.
    // New users get the least privilege by default.
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
