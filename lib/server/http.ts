import "server-only";

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { AvailabilityError } from "./availability";
import { isExclusionViolation, SLOT_TAKEN_MESSAGE } from "./dbErrors";

/**
 * The bits of Express that every Route Handler needs, minus Express.
 *
 * `backend/middleware/zodMiddleware.js` and `backend/middleware/errorHandler.js`
 * were app-level middleware. Route Handlers have no middleware chain, so those
 * two behaviours live here and are called explicitly:
 *
 *   const parsed = await parseJsonBody(request, schema);
 *   if ("error" in parsed) return parsed.error;      // 400, same body as before
 *   ...
 *   catch (error) { return handleRouteError(error); } // the errorHandler net
 */

/** Exactly what `zodMiddleware.js` answered on a validation failure. */
export const VALIDATION_FAILED_BODY = { message: "Give Proper Validations" };

export function validationFailed(): NextResponse {
  return NextResponse.json(VALIDATION_FAILED_BODY, { status: 400 });
}

/**
 * Read + validate a JSON body.
 *
 * IMPORTANT: the RAW body is handed back, not Zod's parsed output. The Express
 * middleware only ever validated `req.body` — it never reassigned it — so the
 * controllers always read the raw values (untrimmed strings, no applied
 * defaults). Returning the parsed object here would silently change behaviour.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
  schema?: ZodType,
): Promise<{ body: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    // `express.json()` treats a missing body as `{}`; a malformed one never
    // reached a controller either.
    raw = undefined;
  }

  const body = (raw ?? {}) as T;

  if (schema) {
    const result = await schema.safeParseAsync(body);
    if (!result.success) {
      console.log(result.error);
      return { error: validationFailed() };
    }
  }

  return { body };
}

/**
 * Port of `backend/middleware/errorHandler.js` — the last-resort translation an
 * Express app got for free from `next(error)`.
 *
 * Safety net for the double-booking guarantee: if a Postgres exclusion-
 * constraint violation (23P01) ever escapes a call site's own try/catch, it
 * must still reach the client as the spec'd slot-taken response rather than a
 * generic 500.
 */
export function handleRouteError(error: unknown): NextResponse {
  if (isExclusionViolation(error)) {
    return NextResponse.json({ success: false, message: SLOT_TAKEN_MESSAGE }, { status: 409 });
  }

  if (error instanceof AvailabilityError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status || 400 },
    );
  }

  const err = error as { code?: string; meta?: { target?: unknown }; status?: number; expose?: boolean; message?: string };

  // Prisma "record not found" on update/delete.
  if (err && err.code === "P2025") {
    return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
  }
  // Prisma unique-constraint violation.
  if (err && err.code === "P2002") {
    const fields = (err.meta && err.meta.target) || [];
    return NextResponse.json(
      {
        success: false,
        message: `A record with this ${Array.isArray(fields) ? fields.join(", ") : fields} already exists.`,
      },
      { status: 409 },
    );
  }

  console.error("[error]", error);
  return NextResponse.json(
    {
      success: false,
      message: (err && err.expose && err.message) || "Something went wrong.",
    },
    { status: err && err.status ? err.status : 500 },
  );
}

/**
 * Strict JSON body parsing for newer routes: returns Zod's PARSED output
 * (trimmed, typed) and, on failure, a 400 listing each field's problem so a
 * form can show it next to the input:
 *   { success: false, message, fieldErrors: { "owner.email": "Invalid email" } }
 */
export async function parseJsonStrict<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: import("zod").infer<S> } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const result = await schema.safeParseAsync(raw ?? {});
  if (result.success) return { data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return {
    error: NextResponse.json(
      { success: false, message: "Please check the highlighted fields.", fieldErrors },
      { status: 400 },
    ),
  };
}
