/**
 * controllers/stats.controller.js
 * Dashboard numbers. Everything is computed in MongoDB (aggregation),
 * never by loading all records into Node.
 */
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

const MONTHS_IN_CHART = 6;

// "2026-11" style key for a date (UTC), used to label monthly buckets
const monthKey = (date) => date.toISOString().slice(0, 7);

// GET /api/stats
export async function getStats(req, res) {
  const now = new Date();
  const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_IN_CHART - 1), 1));

  // All queries are independent, so run them in parallel
  const [totalDoctors, totalPatients, newThisMonth, newLastMonth, patientsPerDoctor, admissions, byCondition] =
    await Promise.all([
      Doctor.estimatedDocumentCount(), // instant: reads collection metadata
      Patient.estimatedDocumentCount(),

      // { admittedAt } index
      Patient.countDocuments({ admittedAt: { $gte: startOfThisMonth } }),
      Patient.countDocuments({ admittedAt: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),

      // Top 10 doctors by number of patients (names joined only for those 10)
      Patient.aggregate([
        { $group: { _id: "$doctor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
        { $unwind: "$doctor" },
        { $project: { _id: 0, doctorId: "$_id", name: "$doctor.name", count: 1 } },
      ]),

      // Patients admitted per month for the chart ({ admittedAt } index)
      Patient.aggregate([
        { $match: { admittedAt: { $gte: chartStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$admittedAt" } }, count: { $sum: 1 } } },
      ]),

      // Patients by condition (for the pie chart)
      Patient.aggregate([
        { $group: { _id: "$condition", count: { $sum: 1 } } },
        { $project: { _id: 0, condition: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
    ]);

  // Fill in months with no admissions so the chart has no gaps
  const countsByMonth = new Map(admissions.map((a) => [a._id, a.count]));
  const admissionsByMonth = Array.from({ length: MONTHS_IN_CHART }, (_, i) => {
    const month = monthKey(new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1)));
    return { month, count: countsByMonth.get(month) || 0 };
  });

  res.json({
    data: {
      totalDoctors,
      totalPatients,
      newThisMonth,
      newLastMonth,
      avgPatientsPerDoctor: totalDoctors ? Math.round((totalPatients / totalDoctors) * 10) / 10 : 0,
      patientsPerDoctor,
      admissionsByMonth,
      byCondition,
    },
  });
}
