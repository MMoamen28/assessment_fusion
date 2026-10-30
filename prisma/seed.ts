import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

export async function runSeed(
  prismaClient: PrismaClient = prisma,
  options: { clean?: boolean } = { clean: true }
) {
  console.log("Seeding database with clean sheet...");

  if (options.clean) {
    await prismaClient.activity.deleteMany();
    await prismaClient.comment.deleteMany();
    await prismaClient.complaint.deleteMany();
    await prismaClient.session.deleteMany();
    await prismaClient.user.deleteMany();
  }

  const passwordHash = await hash("Password123!", 10);

  const admin = await prismaClient.user.create({
    data: {
      email: "admin@example.com",
      name: "Alex Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  console.log(`Created 1 admin user: ${admin.email}`);
  console.log("Clean sheet ready: 1 admin user, 0 agents, 0 complaints.");
}

if (process.argv[1] && /seed\.(ts|js|mjs)$/.test(process.argv[1])) {
  runSeed(prisma, { clean: true })
    .catch((e) => {
      console.error("Error during seeding:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
