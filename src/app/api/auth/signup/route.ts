import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { buildValidationErrorResponse } from "@/lib/auth/validation";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth/cookies";
import { createSessionToken } from "@/lib/auth/session";
import { signupSchema } from "@/schema/auth/signup";

const PASSWORD_SALT_ROUNDS = 12;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(buildValidationErrorResponse(parsed.error), {
      status: 400,
    });
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = await createSessionToken({
      sub: user.id,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Database connection failed. Please verify the database password in your local .env configuration." },
      { status: 500 }
    );
  }
}
