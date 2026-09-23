import "server-only";

// Detection of the Postgres exclusion-constraint violation that backs the
// double-booking guarantee. Direct port of `backend/lib/dbErrors.js`.
//
// VERIFIED EXPERIMENTALLY against @prisma/client 5.22.0 + PostgreSQL 18:
// unlike a unique-constraint violation (a `PrismaClientKnownRequestError` with
// `.code === 'P2002'`), an exclusion violation is NOT mapped to any Prisma
// error code. `prisma.appointment.create()` / `.update()` throw a
// `PrismaClientUnknownRequestError` whose `.code` and `.meta` are BOTH
// `undefined`; the Postgres SQLSTATE only appears inside `.message`:
//
//   PrismaClientUnknownRequestError: Invalid `prisma.appointment.create()` ...
//   Error occurred during query execution:
//   ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(
//     PostgresError { code: "23P01",
//       message: "conflicting key value violates exclusion constraint
//                 \"no_overlapping_appointments\"", ... }), transient: false })
//
// So string-matching the message is the only reliable signal on this path. The
// other branches below cover raw-query (`P2010`, which DOES carry
// `meta.code === '23P01'`) and a bare `pg` driver error, in case a future call
// site uses `$queryRaw` or a direct driver connection.

export const EXCLUSION_CONSTRAINT_NAME = "no_overlapping_appointments";
export const SLOT_TAKEN_MESSAGE = "This slot is no longer available.";

export function isExclusionViolation(error: unknown): boolean {
  if (!error) return false;

  // `any` on purpose: these are runtime shapes from three different error
  // sources (Prisma known/unknown errors, the raw pg driver), none of which
  // share a type. Narrowing here would only obscure the check.
  const err = error as { code?: unknown; meta?: { code?: unknown }; message?: unknown };

  // Raw pg driver error, or Prisma's raw-query passthrough (P2010).
  if (err.code === "23P01") return true;
  if (err.meta && String(err.meta.code) === "23P01") return true;

  const message = String(err.message ?? "");
  return (
    message.includes("23P01") ||
    message.includes("exclusion_violation") ||
    message.includes("exclusion constraint") ||
    message.includes(EXCLUSION_CONSTRAINT_NAME)
  );
}
