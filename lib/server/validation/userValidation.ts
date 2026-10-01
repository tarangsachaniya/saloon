import "server-only";

import { z } from "zod";

// Port of `backend/model/userSchemaValidations.js`.
//
// Public self-signup is removed for the single-salon system (owner/staff
// accounts are created via a seed script instead) - only the login schema
// survives from the old signup/login validation module. The email regex is
// kept verbatim rather than swapped for `z.email()`, so exactly the same
// addresses are accepted as before.

export const loginBodySchema = z.object({
  email: z
    .string()
    .regex(
      /^(?:(?:[^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(?:(?:\[(?:[0-9]{1,3}\.){3}[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      { message: "Invalid Email" },
    ),
  // Registration allows up to 128 characters, so login must too.
  password: z.string().max(128),
});
