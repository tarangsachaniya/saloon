import "server-only";

import type { User } from "@prisma/client";

/**
 * The only User fields that ever leave the server.
 * Port of `publicUser()` in `backend/controller/loginController.js`.
 */
export function publicUser(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}
