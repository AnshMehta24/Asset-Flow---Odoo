import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch departments" }, { status: 500 });
  }
}
