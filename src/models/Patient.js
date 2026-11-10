/**
 * models/Patient.js
 * A patient who belongs to exactly one doctor.
 */
import mongoose from "mongoose";

// Fixed list of conditions. Used for validation, the condition filter and the dashboard chart.
export const CONDITIONS = ["stable", "critical", "recovering", "under-observation", "discharged"];
export const GENDERS = ["male", "female", "other"];

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, required: true, enum: GENDERS },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, lowercase: true, trim: true },
    condition: { type: String, required: true, enum: CONDITIONS },
    // Reference to the doctor this patient is assigned to
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    // Date the patient was admitted (used by date filters and dashboard stats)
    admittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ---------- Indexes (one per query the API runs) ----------

// A doctor's patient list (doctor detail page) and "patients per doctor" stats
patientSchema.index({ doctor: 1, admittedAt: -1 });

// Patients list filtered by condition (+ optional date range), newest first
patientSchema.index({ condition: 1, admittedAt: -1 });

// Default patients list + date-based dashboard stats (admissions per month)
patientSchema.index({ admittedAt: -1 });

// Patients list filtered by gender (+ optional date range), newest first
patientSchema.index({ gender: 1, admittedAt: -1 });

export default mongoose.model("Patient", patientSchema);
