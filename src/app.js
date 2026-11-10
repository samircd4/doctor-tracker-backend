/**
 * app.js
 * Builds the Express app: global middleware + API routes.
 * Kept separate from server.js so the app can be imported without starting a server.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// --- Global middleware ---
app.use(helmet()); // secure HTTP headers
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); // allow the frontend + cookies
app.use(express.json({ limit: "100kb" })); // parse JSON bodies
app.use(cookieParser()); // read the auth cookie

// --- Health check (no auth) ---
app.get("/api/health", (req, res) => {
  const db = mongoose.connection.readyState === 1 ? "up" : "down";
  res.json({ status: "ok", db });
});

// --- API routes ---
app.use("/api", routes);

// --- Error handling (must come last) ---
app.use("/api", notFound); // unknown /api/* route → 404 JSON
app.use(errorHandler); // any thrown error → clean JSON response

export default app;
