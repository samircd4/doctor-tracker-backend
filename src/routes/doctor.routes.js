/**
 * routes/doctor.routes.js
 * /api/doctors/* (all routes require login, applied in routes/index.js)
 */
import { Router } from "express";
import {
  listDoctors,
  getDoctorOptions,
  createDoctor,
  getDoctor,
  listDoctorPatients,
  addPatientToDoctor,
  removePatientFromDoctor,
} from "../controllers/doctor.controller.js";
import { validate } from "../middleware/validate.js";
import { doctorSchema, patientSchema } from "../validators/schemas.js";

const router = Router();

router.get("/", listDoctors);
router.get("/options", getDoctorOptions); // must be before "/:id" so "options" isn't read as an id
router.post("/", validate(doctorSchema), createDoctor);
router.get("/:id", getDoctor);

// Patients of one doctor
router.get("/:id/patients", listDoctorPatients);
router.post("/:id/patients", validate(patientSchema), addPatientToDoctor);
router.delete("/:id/patients/:patientId", removePatientFromDoctor);

export default router;
