import type { AuthenticatedUser } from "@/lib/auth/types";

interface PermAuditCycle {
  status: string;
  auditors: { auditorId: string }[];
}

export function canViewAudit(user: AuthenticatedUser, audit: PermAuditCycle) {
  if (user.role === "ADMIN" || user.role === "ASSET_MANAGER") {
    return true;
  }
  return audit.auditors.some((a) => a.auditorId === user.id);
}

export function canCreateAudit(user: AuthenticatedUser) {
  return user.role === "ADMIN";
}

export function canEditAudit(user: AuthenticatedUser, audit: { status: string }) {
  return user.role === "ADMIN" && audit.status === "PLANNED";
}

export function canStartAudit(user: AuthenticatedUser, audit: { status: string }) {
  return user.role === "ADMIN" && audit.status === "PLANNED";
}

export function canVerifyAuditItem(user: AuthenticatedUser, audit: PermAuditCycle) {
  return audit.status === "IN_PROGRESS" && audit.auditors.some((a) => a.auditorId === user.id);
}

export function canResolveDiscrepancy(user: AuthenticatedUser) {
  return user.role === "ADMIN" || user.role === "ASSET_MANAGER";
}

export function canCloseAudit(user: AuthenticatedUser, audit: { status: string }) {
  return (user.role === "ADMIN" || user.role === "ASSET_MANAGER") && audit.status === "IN_PROGRESS";
}
