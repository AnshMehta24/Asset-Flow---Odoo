import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { buildValidationErrorResponse } from "@/lib/auth/validation";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth/cookies";
import { createSessionToken } from "@/lib/auth/session";
import { loginSchema } from "@/schema/auth/login";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(buildValidationErrorResponse(parsed.error), {
      status: 400,
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      departmentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Your account is inactive." },
      { status: 403 }
    );
  }

  const token = await createSessionToken({
    sub: user.id,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
  });

  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
