// Creates (or resets the password of) the platform operator login.
// Idempotent and NON-destructive: it touches exactly one User row.
//
//   SEED_SUPERADMIN_EMAIL=you@example.com SEED_SUPERADMIN_PASSWORD='a-long-passphrase' \
//     npm run prisma:seed-superadmin
//
// The password is never printed. Use a strong, unique one: this account can see
// and manage every salon on the platform.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_SUPERADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD || "";

  if (!email || !password) {
    throw new Error("Set SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD.");
  }
  if (password.length < 12) {
    throw new Error("SEED_SUPERADMIN_PASSWORD must be at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "SUPER_ADMIN") {
    throw new Error(`${email} already exists as ${existing.role}; refusing to change its role.`);
  }

  const hash = bcrypt.hashSync(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, enabled: true },
    create: {
      firstName: "Platform",
      lastName: "Admin",
      email,
      password: hash,
      role: "SUPER_ADMIN",
      salonId: null,
      enabled: true,
    },
  });
  console.log(`Platform admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
