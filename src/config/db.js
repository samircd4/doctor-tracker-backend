/**
 * config/db.js
 * Opens a single MongoDB connection that the whole app reuses.
 */
import mongoose from "mongoose";

export async function connectDB(uri) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
