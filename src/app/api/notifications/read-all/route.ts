import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/user";

export async function POST() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
