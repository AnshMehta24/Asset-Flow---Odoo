import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/user";
import prisma from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/user";

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
