import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}
