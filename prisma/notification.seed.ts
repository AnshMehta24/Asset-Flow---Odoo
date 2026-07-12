import { PrismaClient } from "../generated/prisma/client";
import { NotificationType } from "../generated/prisma/enums";
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
  console.log("Seeding notifications...");

  // 1. Get the first user available in the database to link notifications to
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error(
      "No user found in the database. Please run the main admin seed first (npx prisma db seed) to create the admin user."
    );
  }

  console.log(`Linking notifications to user: ${user.name} (${user.email})`);

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
    console.error("Error during notifications seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
