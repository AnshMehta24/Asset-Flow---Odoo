import prisma from "@/lib/prisma";
import { getSessionCookie } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";
import type { AuthenticatedUser } from "@/lib/auth/types";

export async function getCurrentUser() {
  const token = await getSessionCookie();

  if (!token) {
    return null;
  }

  let session;

  try {
    session = await verifySessionToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
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

  if (!user) {
    return null;
  }

  return toAuthenticatedUser(user);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (user.status !== "ACTIVE") {
    return null;
  }

  return user;
}

function toAuthenticatedUser(user: {
  id: string;
  name: string;
  email: string;
  role: AuthenticatedUser["role"];
  status: AuthenticatedUser["status"];
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthenticatedUser {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
