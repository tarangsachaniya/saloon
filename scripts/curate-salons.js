// Curates the salon list for the demo / mobile app:
//   1. deletes EVERY salon except `classic-cuts` (children cascade: users,
//      barbers, services, clients, appointments, hours, plans, ...),
//   2. gives Classic Cuts a cover photo if it has none,
//   3. creates three demo shops with photos, services, barbers and an owner login.
//
// DRY RUN by default: it only prints what it would do. Pass --apply to write.
// It runs against whatever DATABASE_URL points at (NextJS/.env), which is the
// live Neon database in this project, so read the dry-run output first.
//
//   node scripts/curate-salons.js            # dry run
//   node scripts/curate-salons.js --apply    # do it
//
// Idempotent: re-running skips shops that already exist. Owner passwords are
// generated and printed ONCE at the end of an --apply run; change them after
// first sign-in.

try { process.loadEnvFile(".env"); } catch { /* DATABASE_URL may already be in the environment */ }
const { randomInt } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const { hashSync } = require("bcryptjs");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const KEEP_SLUG = "classic-cuts";

const photo = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const SHOPS = [
  {
    slug: "glow-nail-bar",
    name: "Glow Nail Bar",
    tagline: "Colour, chrome & tiny works of art",
    about: "A bright, friendly nail studio for gel manicures, nail art and extensions.",
    address: "21 Linking Road, Bandra West, Mumbai",
    phone: "+91 98200 11122",
    email: "hello@glownailbar.example",
    theme: "PLAYFUL",
    accentColor: "#ff6b4a",
    coverUrl: photo("1519014816548-bf5fe059798b"), // red nails
    gallery: [photo("1604654894610-df63bc536371")], // black nails
    owner: { firstName: "Aanya", lastName: "Shah", email: "owner@glownailbar.example" },
    services: [
      { name: "Gel Manicure", price: 600, durationMinutes: 45, category: "Nails", description: "Shape, cuticle care and long-wear gel colour." },
      { name: "Nail Art (per hand)", price: 900, durationMinutes: 60, category: "Nails", description: "Hand-painted designs, chrome or charms." },
      { name: "Pedicure Spa", price: 800, durationMinutes: 50, category: "Nails", description: "Soak, scrub, massage and polish." },
      { name: "Acrylic Extensions", price: 1500, durationMinutes: 90, category: "Nails", description: "Full set, any shape and length." },
    ],
    barbers: [
      { name: "Aanya Shah", bio: "Nail artist with 8 years of chrome and gel experience.", specializations: ["Nail art", "Gel"] },
      { name: "Mira Kapoor", bio: "Extensions and pedicure specialist.", specializations: ["Acrylics", "Pedicure"] },
    ],
  },
  {
    slug: "velvet-hair-studio",
    name: "Velvet Hair Studio",
    tagline: "Cuts, colour & glossy finishes",
    about: "A calm, light-filled hair studio for cuts, colour and treatments.",
    address: "7 100 Feet Road, Indiranagar, Bengaluru",
    phone: "+91 98450 22233",
    email: "hello@velvethair.example",
    theme: "SPA",
    accentColor: "#d96a8a",
    coverUrl: photo("1521590832167-7bcbfaa6381f"),
    gallery: [photo("1560066984-138dadb4c035"), photo("1522337360788-8b13dee7a37e")], // b/w studio, hair
    owner: { firstName: "Riya", lastName: "Menon", email: "owner@velvethair.example" },
    services: [
      { name: "Women's Haircut", price: 700, durationMinutes: 45, category: "Hair", description: "Consultation, wash, cut and finish." },
      { name: "Blow Dry & Style", price: 500, durationMinutes: 30, category: "Hair", description: "Wash and styled blow dry." },
      { name: "Global Colour", price: 3500, durationMinutes: 120, category: "Colour", description: "Single-process all-over colour." },
      { name: "Keratin Treatment", price: 4500, durationMinutes: 150, category: "Treatments", description: "Smoothing treatment for frizz-free hair." },
    ],
    barbers: [
      { name: "Riya Menon", bio: "Senior stylist: precision cuts and colour.", specializations: ["Cuts", "Colour"] },
      { name: "Karan Desai", bio: "Treatments and styling specialist.", specializations: ["Keratin", "Styling"] },
    ],
  },
  {
    slug: "the-brick-room",
    name: "The Brick Room",
    tagline: "Sharp fades. Quiet luxury.",
    about: "A modern grooming lounge for fades, beards and hot-towel shaves.",
    address: "88 Park Street, Kolkata",
    phone: "+91 98300 33344",
    email: "hello@thebrickroom.example",
    theme: "LUXE",
    accentColor: "#8b5cf6",
    coverUrl: photo("1633681926022-84c23e8cb2d6"), // modern brick interior
    gallery: [photo("1503951914875-452162b0f3f1")], // barber at work
    owner: { firstName: "Zayn", lastName: "Ali", email: "owner@thebrickroom.example" },
    services: [
      { name: "Signature Haircut", price: 600, durationMinutes: 40, category: "Hair", description: "Consultation, cut and styled finish." },
      { name: "Beard Trim & Shape", price: 350, durationMinutes: 25, category: "Beard", description: "Line-up and shaping with hot towel." },
      { name: "Hot Towel Shave", price: 450, durationMinutes: 30, category: "Shave", description: "Classic straight-razor shave." },
      { name: "Cut + Beard Combo", price: 850, durationMinutes: 60, category: "Combo", description: "Signature haircut with beard trim." },
    ],
    barbers: [
      { name: "Zayn Ali", bio: "Master barber, fades and razor work.", specializations: ["Fades", "Shaves"] },
      { name: "Dev Malhotra", bio: "Beard sculpting and classic cuts.", specializations: ["Beards", "Classic cuts"] },
    ],
  },
];

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const tempPassword = () => Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// Mon-Sat 10:00-20:00, Sunday closed (same default as the platform create-salon flow).
const HOURS = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, isOpen: weekday !== 0, openTime: 600, closeTime: 1200 }));
const WORKING = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, isWorking: true, startTime: 600, endTime: 1200 }));
const LUNCH = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: 780, endTime: 840, label: "Lunch" }));

async function main() {
  console.log(APPLY ? "== APPLY MODE ==" : "== DRY RUN (nothing is written; pass --apply) ==");

  const doomed = await prisma.salon.findMany({
    where: { slug: { not: KEEP_SLUG } },
    select: { id: true, slug: true, name: true, _count: { select: { users: true, barbers: true, services: true, appointments: true } } },
  });
  console.log(`\nSalons to DELETE (everything except "${KEEP_SLUG}"): ${doomed.length}`);
  for (const s of doomed) console.log(`  - ${s.slug} (${s.name}) users=${s._count.users} barbers=${s._count.barbers} services=${s._count.services} appointments=${s._count.appointments}`);

  const keeper = await prisma.salon.findUnique({ where: { slug: KEEP_SLUG }, select: { id: true, coverUrl: true } });
  if (!keeper) throw new Error(`"${KEEP_SLUG}" does not exist; refusing to delete anything.`);

  const toCreate = [];
  const toSync = []; // existing shops: only their cover/gallery photos are re-synced
  for (const shop of SHOPS) {
    const exists = await prisma.salon.findUnique({ where: { slug: shop.slug }, select: { id: true } });
    const emailTaken = await prisma.user.findUnique({ where: { email: shop.owner.email }, select: { id: true } });
    console.log(`\nShop ${shop.slug}: ${exists ? "already exists (skip)" : emailTaken ? "owner email taken (skip)" : "will be CREATED"}`);
    if (!exists && !emailTaken) toCreate.push(shop);
    if (exists) toSync.push(shop);
  }
  console.log(`\nClassic Cuts cover: ${keeper.coverUrl ? "already set (left alone)" : "will be set"}`);

  if (!APPLY) return console.log("\nDry run complete. Re-run with --apply to make these changes.");

  await prisma.salon.deleteMany({ where: { slug: { not: KEEP_SLUG } } });
  console.log(`\nDeleted ${doomed.length} salon(s).`);

  if (!keeper.coverUrl) {
    await prisma.salon.update({ where: { id: keeper.id }, data: { coverUrl: photo("1585747860715-2ba37e788b70"), accentColor: "#b8733f", theme: "CUT" } });
  }

  for (const shop of toSync) {
    await prisma.salon.update({ where: { slug: shop.slug }, data: { coverUrl: shop.coverUrl, gallery: shop.gallery } });
    console.log(`Synced photos for ${shop.slug}`);
  }

  const credentials = [];
  for (const shop of toCreate) {
    const password = tempPassword();
    const salon = await prisma.salon.create({
      data: {
        slug: shop.slug, name: shop.name, tagline: shop.tagline, about: shop.about, address: shop.address,
        phone: shop.phone, email: shop.email, theme: shop.theme, accentColor: shop.accentColor,
        coverUrl: shop.coverUrl, gallery: shop.gallery,
        settings: { create: {} },
        openingHours: { create: HOURS },
        billingPlans: { create: { planType: "COMMISSION", commissionType: "PERCENT", commissionValue: 10 } },
        users: { create: { firstName: shop.owner.firstName, lastName: shop.owner.lastName, email: shop.owner.email, password: hashSync(password, 10), role: "OWNER", enabled: true } },
      },
    });
    const services = [];
    for (const svc of shop.services) services.push(await prisma.service.create({ data: { ...svc, salonId: salon.id } }));
    for (const b of shop.barbers) {
      await prisma.barber.create({
        data: {
          salonId: salon.id, name: b.name, bio: b.bio, specializations: b.specializations, commissionPercentage: 30,
          services: { connect: services.map((s) => ({ id: s.id })) },
          workingHours: { create: WORKING },
          breaks: { create: LUNCH },
        },
      });
    }
    credentials.push({ shop: shop.slug, email: shop.owner.email, password });
    console.log(`Created ${shop.slug}`);
  }

  if (credentials.length) {
    console.log("\nOwner logins (shown once, change after first sign-in):");
    for (const c of credentials) console.log(`  ${c.shop}: ${c.email} / ${c.password}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
