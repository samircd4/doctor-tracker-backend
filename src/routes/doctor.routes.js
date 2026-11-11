/**
 * routes/doctor.routes.js
 * /api/doctors/* — login is required for all routes (applied in routes/index.js).
 * Reading is open to every logged-in user; creating, editing and deleting
 * require the "admin" role (authorization).
 */
import { Router } from "express";
import {
  listDoctors,
  getDoctorOptions,
  createDoctor,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  listDoctorPatients,
  addPatientToDoctor,
  removePatientFromDoctor,
} from "../controllers/doctor.controller.js";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { doctorSchema, doctorUpdateSchema, patientSchema } from "../validators/schemas.js";

const router = Router();
const adminOnly = requireRole("admin");

router.get("/", listDoctors);
router.get("/options", getDoctorOptions); // must be before "/:id" so "options" isn't read as an id
router.post("/", adminOnly, validate(doctorSchema), createDoctor);
router.get("/:id", getDoctor);
router.put("/:id", adminOnly, validate(doctorUpdateSchema), updateDoctor);
router.delete("/:id", adminOnly, deleteDoctor);

// Patients of one doctor
router.get("/:id/patients", listDoctorPatients);
router.post("/:id/patients", adminOnly, validate(patientSchema), addPatientToDoctor);
router.delete("/:id/patients/:patientId", adminOnly, removePatientFromDoctor);

export default router;
