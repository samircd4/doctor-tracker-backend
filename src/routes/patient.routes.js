/**
 * routes/patient.routes.js
 * /api/patients/* (all routes require login, applied in routes/index.js)
 */
import { Router } from "express";
import { listPatients, updatePatient, deletePatient } from "../controllers/patient.controller.js";
import { validate } from "../middleware/validate.js";
import { patientUpdateSchema } from "../validators/schemas.js";

const router = Router();

router.get("/", listPatients);
router.put("/:id", validate(patientUpdateSchema), updatePatient);
router.delete("/:id", deletePatient);

export default router;
