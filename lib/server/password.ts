import "server-only";

import bcrypt from "bcryptjs";

/**
 * Port of `backend/util/passwordGen.js`.
 *
 * bcryptjs rather than bcrypt: the Express backend used `bcrypt`, which is a
 * native addon (`bcrypt_lib.node`). Native binaries are the classic source of
 * serverless bundling failures — the tracer has to find and ship the right
 * prebuilt for the deployment's libc/arch, and Vercel's build image is not the
 * machine this was installed on. `bcryptjs` is pure JavaScript, produces and
 * verifies the SAME `$2a$/$2b$` hash format, and therefore reads every password
 * already stored in the `User` table by the old backend.
 *
 * Identical API (`hashSync` / `comSync`) so the call sites read the same.
 */

const saltRound = 10;

export function hashSync(pass: string): string {
  return bcrypt.hashSync(pass, saltRound);
}

export function comSync(pass: string, key: string): boolean {
  return bcrypt.compareSync(pass, key);
}
