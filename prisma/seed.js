// !! DESTRUCTIVE + OUT OF DATE !!
// This script wipes EVERY table (all salons, users, bookings) and was written
// for the old single-salon schema, so it also no longer matches the multi-salon
// schema. It is disabled unless ALLOW_DESTRUCTIVE_SEED=1 is set explicitly, and
// will be rewritten to seed demo salons safely. To create the platform
// operator login use `npm run prisma:seed-superadmin` (idempotent, wipes nothing).
if (process.env.ALLOW_DESTRUCTIVE_SEED !== "1") {
  console.error(
    "Refusing to run: this seed deletes all data and targets the old schema.\n" +
      "Use `npm run prisma:seed-superadmin` to create the platform admin instead.",
  );
  process.exit(1);
}

// Wipes and repopulates demo data for local development: one salon profile
// + opening hours, one owner login, a handful of barbers with schedules/
// breaks/days-off, a set of services, and a few clients/appointments so the
// admin dashboard and booking flow have real fixtures to work against.
//
// Port of backend/scripts/seedDemoData.js for the consolidated Next.js app's
// Prisma schema (same shape, Client.name instead of first/last name splits).
//
// Run with: node prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const MINUTES = {
  "09:00": 540, "10:00": 600, "11:00": 660, "13:00": 780, "14:00": 840,
  "18:00": 1080, "20:00": 1200, "21:00": 1260,
};

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function wipe() {
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.barber.deleteMany(); // cascades working hours / breaks / days off
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salonOpeningHour.deleteMany();
  await prisma.salonSettings.deleteMany();
}

async function seedSalon() {
  await prisma.salonSettings.create({
    data: {
      id: 1,
      name: "Classic Cuts Barbershop",
      phone: "+91 98765 43210",
      email: "hello@classiccuts.example",
      address: "12 MG Road, Bengaluru, India",
      slotIntervalMinutes: 15,
      minimumAdvanceBookingMinutes: 30,
      maximumAdvanceBookingDays: 30,
      cancellationWindowMinutes: 60,
    },
  });

  // weekday: 0=Sunday .. 6=Saturday
  const weeklyHours = [
    { weekday: 0, isOpen: false, openTime: 0, closeTime: 0 },
    { weekday: 1, isOpen: true, openTime: MINUTES["10:00"], closeTime: MINUTES["20:00"] },
    { weekday: 2, isOpen: true, openTime: MINUTES["10:00"], closeTime: MINUTES["20:00"] },
    { weekday: 3, isOpen: true, openTime: MINUTES["10:00"], closeTime: MINUTES["20:00"] },
    { weekday: 4, isOpen: true, openTime: MINUTES["10:00"], closeTime: MINUTES["20:00"] },
    { weekday: 5, isOpen: true, openTime: MINUTES["10:00"], closeTime: MINUTES["20:00"] },
    { weekday: 6, isOpen: true, openTime: MINUTES["09:00"], closeTime: MINUTES["21:00"] },
  ];
  await prisma.salonOpeningHour.createMany({ data: weeklyHours });
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL || "owner@example.com";
  const password = process.env.SEED_OWNER_PASSWORD || "ChangeMe123!";
  await prisma.user.create({
    data: {
      firstName: "Salon",
      lastName: "Owner",
      email,
      password: bcrypt.hashSync(password, 10),
      phoneNumber: "+91 90000 00000",
      role: "OWNER",
      enabled: true,
    },
  });
  console.log(`Seeded owner login: ${email} / ${password}`);
}

async function seedServices() {
  const services = await prisma.$transaction([
    prisma.service.create({ data: { name: "Haircut", description: "Classic haircut, wash included", price: 300, durationMinutes: 30, category: "Hair", isActive: true } }),
    prisma.service.create({ data: { name: "Haircut + Beard", description: "Haircut with beard shaping", price: 450, durationMinutes: 45, category: "Hair", isActive: true } }),
    prisma.service.create({ data: { name: "Beard Trim", description: "Beard shaping and line-up", price: 150, durationMinutes: 15, category: "Beard", isActive: true } }),
    prisma.service.create({ data: { name: "Hair Styling", description: "Wash, blow-dry and styling", price: 250, durationMinutes: 30, category: "Styling", isActive: true } }),
    prisma.service.create({ data: { name: "Hair Wash", description: "Shampoo and conditioning", price: 100, durationMinutes: 15, category: "Hair", isActive: true } }),
    prisma.service.create({ data: { name: "Hair Coloring", description: "Full hair color application", price: 800, durationMinutes: 60, category: "Styling", isActive: true } }),
    prisma.service.create({ data: { name: "Facial", description: "Deep-cleansing facial", price: 500, durationMinutes: 45, category: "Skin", isActive: true } }),
    prisma.service.create({ data: { name: "Kids Haircut", description: "Haircut for children under 12", price: 200, durationMinutes: 20, category: "Hair", isActive: true } }),
  ]);
  return Object.fromEntries(services.map((s) => [s.name, s]));
}

async function seedBarbers(services) {
  const salonWorkingDays = [1, 2, 3, 4, 5, 6]; // Mon-Sat, matches salon hours
  const standardHours = (weekday) => ({
    weekday,
    isWorking: true,
    startTime: weekday === 6 ? MINUTES["09:00"] : MINUTES["10:00"],
    endTime: weekday === 6 ? MINUTES["21:00"] : MINUTES["20:00"],
  });
  const lunchBreak = (weekday) => ({ weekday, startTime: MINUTES["13:00"], endTime: MINUTES["14:00"], label: "Lunch" });

  const rahul = await prisma.barber.create({
    data: {
      name: "Rahul",
      phone: "+91 91234 00001",
      email: "rahul@classiccuts.example",
      bio: "Senior barber with 12 years of experience.",
      specializations: ["Senior Barber", "Haircut", "Beard Styling"],
      isActive: true,
      workingHours: { create: salonWorkingDays.map(standardHours) },
      breaks: { create: salonWorkingDays.map(lunchBreak) },
      services: { connect: Object.values(services).map((s) => ({ id: s.id })) }, // qualified for everything
    },
  });

  const akash = await prisma.barber.create({
    data: {
      name: "Akash",
      phone: "+91 91234 00002",
      email: "akash@classiccuts.example",
      bio: "Hair stylist specializing in modern cuts and color.",
      specializations: ["Hair Stylist", "Styling", "Coloring"],
      isActive: true,
      workingHours: { create: [2, 3, 4, 5, 6].map(standardHours) }, // off Mon
      breaks: { create: [2, 3, 4, 5, 6].map(lunchBreak) },
      services: {
        connect: [services["Haircut"], services["Hair Styling"], services["Hair Coloring"], services["Hair Wash"]].map((s) => ({ id: s.id })),
      },
      daysOff: {
        create: [{ date: dateOnly(addDays(new Date(), 5)), reason: "Personal leave" }],
      },
    },
  });

  const jay = await prisma.barber.create({
    data: {
      name: "Jay",
      phone: "+91 91234 00003",
      email: "jay@classiccuts.example",
      bio: "Barber focused on classic cuts and beard grooming.",
      specializations: ["Barber", "Haircut", "Beard"],
      isActive: true,
      workingHours: { create: [1, 2, 3, 4, 5].map(standardHours) }, // off Sat/Sun
      breaks: { create: [1, 2, 3, 4, 5].map(lunchBreak) },
      services: {
        connect: [services["Haircut"], services["Haircut + Beard"], services["Beard Trim"], services["Kids Haircut"]].map((s) => ({ id: s.id })),
      },
    },
  });

  const karan = await prisma.barber.create({
    data: {
      name: "Karan",
      phone: "+91 91234 00004",
      email: "karan@classiccuts.example",
      bio: "Junior barber, great with kids.",
      specializations: ["Junior Barber", "Kids Haircut"],
      isActive: true,
      workingHours: { create: salonWorkingDays.map(standardHours) },
      breaks: { create: salonWorkingDays.map(lunchBreak) },
      services: {
        connect: [services["Haircut"], services["Hair Wash"], services["Kids Haircut"]].map((s) => ({ id: s.id })),
      },
    },
  });

  return { rahul, akash, jay, karan };
}

async function seedClientsAndAppointments(services, barbers) {
  const clientDefs = [
    { name: "Amit Sharma", phone: "+919811100001", email: "amit@example.com" },
    { name: "Karan Mehta", phone: "+919811100002", email: "karan.m@example.com" },
    { name: "Priya Nair", phone: "+919811100003", email: "priya@example.com" },
    { name: "Sana Khan", phone: "+919811100004", email: null },
    { name: "Vikram Rao", phone: "+919811100005", email: "vikram@example.com" },
  ];
  const clients = {};
  for (const c of clientDefs) {
    clients[c.name] = await prisma.client.create({ data: { ...c, totalVisits: 0 } });
  }

  const today = dateOnly(new Date());

  async function book(clientName, barber, service, dayOffset, startTime, status) {
    const client = clients[clientName];
    const appointmentDate = addDays(today, dayOffset);
    const endTime = startTime + service.durationMinutes;
    await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId: barber.id,
        serviceId: service.id,
        appointmentDate,
        startTime,
        endTime,
        durationMinutes: service.durationMinutes,
        price: service.price,
        status,
      },
    });
    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalVisits: { increment: 1 },
        lastVisit: status === "COMPLETED" ? appointmentDate : undefined,
      },
    });
  }

  await book("Amit Sharma", barbers.rahul, services["Haircut"], -7, MINUTES["10:00"], "COMPLETED");
  await book("Karan Mehta", barbers.jay, services["Haircut + Beard"], -5, MINUTES["14:00"] + 60, "COMPLETED");
  await book("Priya Nair", barbers.akash, services["Hair Styling"], -3, MINUTES["10:00"], "COMPLETED");
  await book("Sana Khan", barbers.karan, services["Kids Haircut"], -2, MINUTES["11:00"], "NO_SHOW");
  await book("Vikram Rao", barbers.rahul, services["Beard Trim"], 0, MINUTES["18:00"], "CONFIRMED");
  await book("Amit Sharma", barbers.jay, services["Haircut"], 1, MINUTES["11:00"], "CONFIRMED");
}

async function main() {
  console.log("Wiping existing data...");
  await wipe();
  console.log("Seeding salon settings + opening hours...");
  await seedSalon();
  console.log("Seeding owner login...");
  await seedOwner();
  console.log("Seeding services...");
  const services = await seedServices();
  console.log("Seeding barbers + schedules...");
  const barbers = await seedBarbers(services);
  console.log("Seeding clients + appointments...");
  await seedClientsAndAppointments(services, barbers);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
