/**
 * validators/schemas.js
 * All Zod schemas used to validate request bodies.
 */
import { z } from "zod";

// POST /api/auth/login
export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
