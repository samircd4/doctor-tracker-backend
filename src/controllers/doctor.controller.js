/**
 * controllers/doctor.controller.js
 * Doctor endpoints, plus the doctor → patients sub-resource
 * (list / add / remove patients of one doctor).
 */
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { getPagination, dateRange, searchFilter, paginate } from "../utils/listQuery.js";

// Count patients for a set of doctors in ONE query (avoids one query per doctor)
async function countPatientsByDoctor(doctorIds) {
  const counts = await Patient.aggregate([
    { $match: { doctor: { $in: doctorIds } } }, // uses the { doctor, admittedAt } index
    { $group: { _id: "$doctor", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((c) => [String(c._id), c.count]));
}

// GET /api/doctors?q=&specialization=&hospital=&from=&to=&page=&limit=
export async function listDoctors(req, res) {
  const { q, specialization, hospital, from, to } = req.query;
  const { page, limit } = getPagination(req.query);

  // Only add conditions for filters the user actually sent
  const filter = {};
  if (specialization) filter.specialization = specialization; // { specialization, createdAt } index
  if (hospital) filter.hospital = hospital; // { hospital, createdAt } index
  const created = dateRange(from, to);
  if (created) filter.createdAt = created; // { createdAt } index
  const search = searchFilter(q, ["name", "email", "specialization", "hospital"]);
  if (search) Object.assign(filter, search);

  const result = await paginate(Doctor, filter, { page, limit, sort: { createdAt: -1 } });

  // Attach each doctor's patient count
  const counts = await countPatientsByDoctor(result.data.map((d) => d._id));
  result.data = result.data.map((d) => ({ ...d, patientCount: counts.get(String(d._id)) || 0 }));

  res.json(result);
}

// GET /api/doctors/options — small lists for dropdowns (doctor select + filter options)
export async function getDoctorOptions(req, res) {
  const [doctors, specializations, hospitals] = await Promise.all([
    Doctor.find().select("name specialization").sort({ name: 1 }).lean(),
    Doctor.distinct("specialization"),
    Doctor.distinct("hospital"),
  ]);
  res.json({ data: { doctors, specializations: specializations.sort(), hospitals: hospitals.sort() } });
}

// POST /api/doctors
export async function createDoctor(req, res) {
  const doctor = await Doctor.create(req.body); // duplicate email → 409 via errorHandler
  res.status(201).json({ data: doctor });
}

// GET /api/doctors/:id
export async function getDoctor(req, res) {
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) return res.status(404).json({ error: { message: "Doctor not found" } });

  const patientCount = await Patient.countDocuments({ doctor: doctor._id });
  res.json({ data: { ...doctor, patientCount } });
}

// PUT /api/doctors/:id  (admin only)
export async function updateDoctor(req, res) {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // return the updated document
    runValidators: true, // apply schema rules on update too
  }).lean(); // duplicate email → 409 via errorHandler
  if (!doctor) return res.status(404).json({ error: { message: "Doctor not found" } });

  const patientCount = await Patient.countDocuments({ doctor: doctor._id });
  res.json({ data: { ...doctor, patientCount } });
}

// DELETE /api/doctors/:id  (admin only)
// Also deletes the doctor's patients, so no patient is left pointing at a missing doctor.
// (A replica-set MongoDB could wrap both deletes in a transaction.)
export async function deleteDoctor(req, res) {
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) return res.status(404).json({ error: { message: "Doctor not found" } });

  const { deletedCount } = await Patient.deleteMany({ doctor: doctor._id }); // { doctor } index
  await Doctor.deleteOne({ _id: doctor._id });
  res.json({ data: { deletedDoctor: doctor._id, deletedPatients: deletedCount } });
}

// GET /api/doctors/:id/patients?q=&condition=&from=&to=&page=&limit=
export async function listDoctorPatients(req, res) {
  const { q, condition, from, to } = req.query;
  const { page, limit } = getPagination(req.query);

  const filter = { doctor: req.params.id }; // { doctor, admittedAt } index
  if (condition) filter.condition = condition;
  const admitted = dateRange(from, to);
  if (admitted) filter.admittedAt = admitted;
  const search = searchFilter(q, ["name", "email", "phone"]);
  if (search) Object.assign(filter, search);

  res.json(await paginate(Patient, filter, { page, limit, sort: { admittedAt: -1 } }));
}

// POST /api/doctors/:id/patients
export async function addPatientToDoctor(req, res) {
  const doctorExists = await Doctor.exists({ _id: req.params.id });
  if (!doctorExists) return res.status(404).json({ error: { message: "Doctor not found" } });

  const patient = await Patient.create({ ...req.body, doctor: req.params.id });
  res.status(201).json({ data: patient });
}

// DELETE /api/doctors/:id/patients/:patientId
export async function removePatientFromDoctor(req, res) {
  // Matching on both ids makes sure the patient really belongs to this doctor
  const deleted = await Patient.findOneAndDelete({ _id: req.params.patientId, doctor: req.params.id });
  if (!deleted) return res.status(404).json({ error: { message: "Patient not found for this doctor" } });
  res.status(204).end();
}
