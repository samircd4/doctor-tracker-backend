/**
 * routes/index.js
 * Mounts every route group under /api.
 */
import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/auth", authRoutes);
// Step 4 adds: /doctors, /patients, /stats (all protected by requireAuth)

export default router;
