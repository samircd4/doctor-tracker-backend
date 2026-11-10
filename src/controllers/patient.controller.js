/**
 * controllers/patient.controller.js
 * Endpoints for the dedicated Patients page: list, edit, delete.
 */
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import { getPagination, dateRange, searchFilter, paginate } from "../utils/listQuery.js";

// GET /api/patients?q=&condition=&gender=&doctor=&from=&to=&page=&limit=
export async function listPatients(req, res) {
  const { q, condition, gender, doctor, from, to } = req.query;
  const { page, limit } = getPagination(req.query);

  // Only add conditions for filters the user actually sent
  const filter = {};
  if (doctor) filter.doctor = doctor; // { doctor, admittedAt } index
  if (condition) filter.condition = condition; // { condition, admittedAt } index
  if (gender) filter.gender = gender; // { gender, admittedAt } index
  const admitted = dateRange(from, to);
  if (admitted) filter.admittedAt = admitted; // { admittedAt } index
  const search = searchFilter(q, ["name", "email", "phone"]);
  if (search) Object.assign(filter, search);

  const result = await paginate(Patient, filter, {
    page,
    limit,
    sort: { admittedAt: -1 },
    // One extra query fetches all doctors on this page at once (no N+1)
    populate: { path: "doctor", select: "name specialization" },
  });
  res.json(result);
}

// PUT /api/patients/:id
export async function updatePatient(req, res) {
  // If the patient is being moved to another doctor, make sure that doctor exists
  if (req.body.doctor && !(await Doctor.exists({ _id: req.body.doctor }))) {
    return res.status(400).json({ error: { message: "Selected doctor does not exist" } });
  }

  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // return the updated document
    runValidators: true, // apply schema rules (enums, min/max) on update too
  })
    .populate("doctor", "name specialization")
    .lean();

  if (!patient) return res.status(404).json({ error: { message: "Patient not found" } });
  res.json({ data: patient });
}

// DELETE /api/patients/:id
export async function deletePatient(req, res) {
  const deleted = await Patient.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: { message: "Patient not found" } });
  res.status(204).end();
}
