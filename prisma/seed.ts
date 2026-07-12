import { PrismaClient, Role, UserStatus, NotificationType } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Setup connection adapter; ensure DATABASE_URL is not undefined under strict type checks
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

interface NotificationSeed {
  type: keyof typeof NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead?: boolean;
}

async function main() {
  console.log("Seeding started...");

  // 1. Ensure a User exists to associate notifications with
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log("No existing user found. Creating default admin account...");
    const name = process.env.ADMIN_NAME || "System Admin";
    const email = process.env.ADMIN_EMAIL || "admin@assetflow.com";
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
    console.log(`Created user: ${user.name} (${user.email})`);
  } else {
    console.log(`Using existing user: ${user.name} (${user.email})`);
  }

  if (!user) {
    throw new Error("A valid user could not be found or created for seeding notifications.");
  }

  // 2. Read and parse notification seed JSON data
  const jsonPath = path.join(__dirname, "notifications.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Seed data file not found at: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const notificationSeeds: NotificationSeed[] = JSON.parse(rawData);

  console.log(`Found ${notificationSeeds.length} notifications to seed.`);

  // 3. Clear existing notifications to avoid duplicates
  await prisma.notification.deleteMany();
  console.log("Cleared existing notifications.");

  // 4. Seed notifications linked to our user
  let seededCount = 0;
  for (const n of notificationSeeds) {
    await prisma.notification.create({
      data: {
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        link: n.link || null,
        isRead: n.isRead || false,
        userId: user.id,
      },
    });
    seededCount++;
  }

  console.log(`Seeding completed successfully! Inserted ${seededCount} notifications.`);
}

main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
