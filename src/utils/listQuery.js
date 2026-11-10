/**
 * utils/listQuery.js
 * Small helpers shared by every list endpoint: pagination, date range, search.
 */

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Read ?page=&limit= safely (numbers only, limit capped so nobody can request 1M rows)
export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  return { page, limit };
}

// Build a { $gte, $lte } date condition from ?from=YYYY-MM-DD&to=YYYY-MM-DD
// `to` is moved to the end of that day so the whole day is included.
export function dateRange(from, to) {
  const range = {};
  if (from && !isNaN(new Date(from))) range.$gte = new Date(from);
  if (to && !isNaN(new Date(to))) {
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : null;
}

// Case-insensitive "contains" search over several fields.
// User input is escaped so characters like "(" or "*" can't break the regex.
// Note: this runs on top of the indexed filters (date, condition, doctor...).
// For millions of rows we'd switch to MongoDB Atlas Search.
export function searchFilter(q, fields) {
  if (!q || !q.trim()) return null;
  const escaped = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

/**
 * Run a paginated find + count in parallel.
 * Both use the same filter, so both are served by the same index.
 * Returns: { data, meta: { page, limit, total, totalPages } }
 */
export async function paginate(Model, filter, { page, limit, sort, populate, select }) {
  const [data, total] = await Promise.all([
    Model.find(filter)
      .select(select || "")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populate || [])
      .lean(), // plain JS objects: faster, we don't need Mongoose documents here
    Model.countDocuments(filter),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
