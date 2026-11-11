/**
 * validators/schemas.js
 * All Zod schemas used to validate request bodies.
 */
import { z } from "zod";
import { CONDITIONS, GENDERS } from "../models/Patient.js";

// Reusable pieces
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const phone = z.string("Phone is required").trim().regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number");
// Optional fields: treat an empty string from a form the same as "not provided"
const optional = (schema) => z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

// POST /api/auth/login
export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// POST /api/doctors
export const doctorSchema = z.object({
  name: z.string("Name is required").trim().min(2, "Name is too short").max(100),
  specialization: z.string("Specialization is required").trim().min(2, "Specialization is required").max(80),
  hospital: z.string("Hospital is required").trim().min(2, "Hospital is required").max(120),
  phone,
  email: z.email("Enter a valid email").trim().toLowerCase(),
});

// PUT /api/doctors/:id — same fields, all optional
export const doctorUpdateSchema = doctorSchema.partial();

// POST /api/doctors/:id/patients
export const patientSchema = z.object({
  name: z.string("Name is required").trim().min(2, "Name is too short").max(100),
  age: z.coerce.number("Age is required").int().min(0, "Age must be 0 or more").max(130, "Age looks wrong"),
  gender: z.enum(GENDERS, "Select a gender"),
  condition: z.enum(CONDITIONS, "Select a condition"),
  phone: optional(phone),
  email: optional(z.email("Enter a valid email").trim().toLowerCase()),
  admittedAt: optional(z.coerce.date()),
});

// PUT /api/patients/:id — same fields, all optional, and the doctor can be changed
export const patientUpdateSchema = patientSchema.partial().extend({
  doctor: objectId.optional(),
});
