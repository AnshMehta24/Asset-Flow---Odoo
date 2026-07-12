import type { Role, UserStatus } from "../../../generated/prisma/client";

export type SessionPayload = {
  sub: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
};
