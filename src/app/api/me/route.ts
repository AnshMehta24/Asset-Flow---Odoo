import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";

export async function GET() {
  const user = await requireCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ user });
}
