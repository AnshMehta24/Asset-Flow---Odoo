import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

const PASSWORD_SALT_ROUNDS = 12;

async function main() {
  const ADMIN_NAME = process.env.ADMIN_NAME?.trim();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_NAME) {
    throw new Error("ADMIN_NAME is required.");
  }

  if (!ADMIN_EMAIL) {
    throw new Error("ADMIN_EMAIL is required.");
  }

  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required.");
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      departmentId: null,
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      departmentId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      departmentId: true,
    },
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
