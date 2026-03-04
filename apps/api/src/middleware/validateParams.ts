import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export function validateParams(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid parameters",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    req.params = result.data;
    next();
  };
}
