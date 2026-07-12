import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  await clearSessionCookie();
  redirect("/login");
}
