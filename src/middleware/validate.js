/**
 * middleware/validate.js
 * Validates req.body against a Zod schema before it reaches the controller.
 * On failure it returns 400 with a list of field errors.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({ error: { message: "Validation failed", details } });
    }

    req.body = result.data; // cleaned data (trimmed, unknown fields removed)
    next();
  };
}
