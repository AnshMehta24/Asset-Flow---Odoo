import { PrismaClient } from "../generated/prisma/client";
import { Role, UserStatus } from "../generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// Setup connection adapter; ensure DATABASE_URL is not undefined under strict type checks
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding admin account...");

  const email = process.env.ADMIN_EMAIL || "admin@assetflow.com";
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const name = process.env.ADMIN_NAME || "System Admin";
    const passwordHash = "$2b$10$EpI5sK.y5L6N7h8sM5h.K.6B4jF8c8d8e8f8g8h8i8j8k8l8m8n8o"; // Mock bcrypt hash for 'password'

    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Created admin account: ${user.name} (${user.email})`);
  } else {
    console.log(`Admin account already exists: ${user.name} (${user.email})`);
  }
}

main()
  .catch((e) => {
    console.error("Error during admin seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
