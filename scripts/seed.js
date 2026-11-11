/**
 * scripts/seed.js
 * Creates the demo users (admin + read-only staff) and realistic sample data.
 *
 * Usage:  npm run seed                      → users + sample data
 *         npm run seed -- --users-only      → only create/update the two users (keeps all data)
 * WARNING: without --users-only, deletes all existing doctors and patients first.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import User from "../src/models/User.js";
import Doctor from "../src/models/Doctor.js";
import Patient, { CONDITIONS, GENDERS } from "../src/models/Patient.js";

// ---------- Settings ----------
// admin: full access. staff: can view everything but not create/edit/delete (shows authorization).
const USERS = [
  { name: "Admin", email: "admin@test.com", password: "Admin@123", role: "admin" },
  { name: "Staff", email: "staff@test.com", password: "Staff@123", role: "staff" },
];
const USERS_ONLY = process.argv.includes("--users-only");
const DOCTOR_COUNT = 30;
const PATIENT_COUNT = 500;
const MONTHS_OF_HISTORY = 6;

// Small fixed lists so the specialization / hospital filters have repeated values
const SPECIALIZATIONS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology",
  "Oncology", "General Medicine", "Psychiatry", "Gynecology", "ENT",
];
const HOSPITALS = [
  "City General Hospital", "Green Valley Medical Center", "St. Mary's Hospital",
  "Sunrise Clinic", "Metro Health Institute", "Lakeside Hospital",
];

// Random date between `months` ago and now
const randomPastDate = (months) =>
  faker.date.between({ from: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000), to: new Date() });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // 1. Demo users — upsert so running the seed twice doesn't duplicate them
  for (const user of USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await User.updateOne(
      { email: user.email },
      { $set: { name: user.name, password: hashedPassword, role: user.role } },
      { upsert: true }
    );
    console.log(`${user.role.padEnd(5)} ready: ${user.email} / ${user.password}`);
  }

  if (USERS_ONLY) {
    await User.syncIndexes();
    await mongoose.disconnect();
    console.log("Users updated (doctors and patients were not touched)");
    return;
  }

  // 2. Clear old sample data
  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);

  // 3. Doctors (createdAt spread over the past months so date filters show results)
  const doctorDocs = Array.from({ length: DOCTOR_COUNT }, (_, i) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    return {
      name: `Dr. ${firstName} ${lastName}`,
      specialization: faker.helpers.arrayElement(SPECIALIZATIONS),
      hospital: faker.helpers.arrayElement(HOSPITALS),
      phone: faker.string.numeric({ length: 11 }),
      // index `i` guarantees each email is unique
      email: `${firstName}.${lastName}${i}@hospital.test`.toLowerCase(),
      createdAt: randomPastDate(MONTHS_OF_HISTORY),
    };
  });
  const doctors = await Doctor.insertMany(doctorDocs);
  console.log(`Inserted ${doctors.length} doctors`);

  // 4. Patients, each assigned to a random doctor
  const patientDocs = Array.from({ length: PATIENT_COUNT }, () => {
    const gender = faker.helpers.arrayElement(GENDERS);
    const sex = gender === "other" ? undefined : gender; // faker only knows male/female names
    const admittedAt = randomPastDate(MONTHS_OF_HISTORY);
    return {
      name: faker.person.fullName({ sex }),
      age: faker.number.int({ min: 1, max: 90 }),
      gender,
      phone: faker.string.numeric({ length: 11 }),
      email: faker.internet.email().toLowerCase(),
      condition: faker.helpers.arrayElement(CONDITIONS),
      doctor: faker.helpers.arrayElement(doctors)._id,
      admittedAt,
      createdAt: admittedAt,
    };
  });
  await Patient.insertMany(patientDocs);
  console.log(`Inserted ${PATIENT_COUNT} patients`);

  // 5. Make sure every index defined in the models exists in MongoDB
  await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes()]);
  console.log("Indexes synced");

  await mongoose.disconnect();
  console.log("Seed complete");
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
