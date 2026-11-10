/**
 * models/Doctor.js
 * A doctor managed by the admin. Patients reference a doctor by its _id.
 */
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    specialization: { type: String, required: true, trim: true, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    // `unique` creates an index and stops two doctors sharing an email
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true } // adds createdAt / updatedAt (createdAt is used by the date filter)
);

// ---------- Indexes (one per query the API runs) ----------

// Default doctors list: newest first, optionally filtered by date range
doctorSchema.index({ createdAt: -1 });

// Doctors list filtered by specialization (+ optional date range), newest first
doctorSchema.index({ specialization: 1, createdAt: -1 });

// Doctors list filtered by hospital (+ optional date range), newest first
doctorSchema.index({ hospital: 1, createdAt: -1 });

// Search box: full-text search across these fields (name matches rank highest)
doctorSchema.index(
  { name: "text", specialization: "text", hospital: "text", email: "text" },
  { weights: { name: 10, email: 5, specialization: 3, hospital: 2 }, name: "doctor_text_search" }
);

export default mongoose.model("Doctor", doctorSchema);
