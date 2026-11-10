/**
 * routes/stats.routes.js
 * /api/stats (requires login, applied in routes/index.js)
 */
import { Router } from "express";
import { getStats } from "../controllers/stats.controller.js";

const router = Router();

router.get("/", getStats);

export default router;
