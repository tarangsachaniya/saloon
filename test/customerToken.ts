import prisma from "@/lib/server/prisma";
import { generateToken } from "@/lib/server/jwt";
import { hashSync } from "@/lib/server/password";

/**
 * Booking now requires a signed-in customer. Tests that book create one
 * throwaway CUSTOMER (unique `test-` email) and remove exactly that row after.
 */
export async function makeCustomer(tag: string) {
  const user = await prisma.user.create({
    data: {
      firstName: "Test",
      email: `${tag}-customer@example.test`,
      password: hashSync("TestCustomer123!"),
      role: "CUSTOMER",
    },
  });
  return { id: user.id, token: generateToken({ id: user.id, role: "CUSTOMER", salonId: null }) };
}

export const dropCustomer = (id: string) => prisma.user.deleteMany({ where: { id } });
