/**
 * routes/patient.routes.js
 * /api/patients/* — login is required for all routes (applied in routes/index.js).
 * Editing and deleting require the "admin" role (authorization).
 */
import { Router } from "express";
import { listPatients, updatePatient, deletePatient } from "../controllers/patient.controller.js";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { patientUpdateSchema } from "../validators/schemas.js";

const router = Router();
const adminOnly = requireRole("admin");

router.get("/", listPatients);
router.put("/:id", adminOnly, validate(patientUpdateSchema), updatePatient);
router.delete("/:id", adminOnly, deletePatient);

export default router;
