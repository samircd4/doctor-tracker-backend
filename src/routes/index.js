/**
 * routes/index.js
 * Mounts every route group under /api.
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import authRoutes from "./auth.routes.js";
import doctorRoutes from "./doctor.routes.js";
import patientRoutes from "./patient.routes.js";
import statsRoutes from "./stats.routes.js";

const router = Router();

// Public (login/logout)
router.use("/auth", authRoutes);

// Everything below requires a logged-in user
router.use("/doctors", requireAuth, doctorRoutes);
router.use("/patients", requireAuth, patientRoutes);
router.use("/stats", requireAuth, statsRoutes);

export default router;
