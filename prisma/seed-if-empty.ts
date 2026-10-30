import { PrismaClient } from "@prisma/client";
import { runSeed } from "./seed";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`Database already seeded (${userCount} users found). Skipping seed.`);
    return;
  }

  console.log("Database is empty. Running seed...");
  await runSeed(prisma, { clean: false });
}

main()
  .catch((e) => {
    console.error("Error running seed-if-empty:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
