"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireCurrentUser } from "@/lib/auth/user";
import { AuditService } from "@/lib/audits/audit.service";
import { previewAuditAssetCount } from "@/lib/audits/audit.queries";
import type {
  CreateAuditCycleInput,
  VerifyAuditItemInput,
  ResolveAuditDiscrepancyInput,
} from "@/lib/audits/audit.types";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const ERROR_MESSAGES: Record<string, string> = {
  AUDIT_FORBIDDEN: "You don't have access to this audit cycle.",
  AUDIT_NOT_FOUND: "Audit cycle not found.",
  AUDIT_ITEM_NOT_FOUND: "Checklist item not found.",
  AUDIT_NOT_PLANNED: "This audit cycle is no longer in planning.",
  AUDIT_HAS_NO_AUDITORS: "Assign at least one active auditor.",
  AUDIT_HAS_NO_ASSETS: "No active assets match this audit's scope.",
  INVALID_AUDIT_SCOPE: "The selected department no longer exists.",
  AUDIT_NOT_IN_PROGRESS: "This audit cycle is not in progress.",
  INVALID_DISCREPANCY_STATE: "This item has no discrepancy to resolve.",
  AUDIT_HAS_PENDING_ITEMS: "Some checklist items are still pending verification.",
  AUDIT_HAS_OPEN_DISCREPANCIES: "Some discrepancies are still awaiting review.",
};

function toResult(error: unknown): { success: false; error: string; code?: string } {
  if (error instanceof ZodError) {
    return { success: false, error: error.issues[0]?.message ?? "Validation failed." };
  }

  const message = error instanceof Error ? error.message : "Something went wrong.";
  return {
    success: false,
    error: ERROR_MESSAGES[message] ?? message,
    code: ERROR_MESSAGES[message] ? message : undefined,
  };
}

// Single entry point for both create and edit, mirroring upsertBooking in
// resource-booking/actions.ts: no auditId -> create; auditId provided -> update.
export async function upsertAuditCycle(
  input: CreateAuditCycleInput,
  auditId?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    const cycle = auditId
      ? await AuditService.updateAuditCycle(auditId, input, user)
      : await AuditService.createAuditCycle(input, user);
    revalidatePath("/audits");
    if (auditId) revalidatePath(`/audits/${auditId}`);
    return { success: true, data: { id: cycle.id } };
  } catch (error) {
    return toResult(error);
  }
}

export async function startAuditCycle(auditId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    await AuditService.startAuditCycle(auditId, user);
    revalidatePath("/audits");
    revalidatePath(`/audits/${auditId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return toResult(error);
  }
}

export async function verifyAuditItem(
  auditId: string,
  itemId: string,
  input: VerifyAuditItemInput
): Promise<ActionResult> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    await AuditService.verifyAuditItem(auditId, itemId, input, user);
    revalidatePath(`/audits/${auditId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return toResult(error);
  }
}

export async function resolveAuditDiscrepancy(
  auditId: string,
  itemId: string,
  input: ResolveAuditDiscrepancyInput
): Promise<ActionResult> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    await AuditService.resolveAuditDiscrepancy(auditId, itemId, input, user);
    revalidatePath(`/audits/${auditId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return toResult(error);
  }
}

export async function closeAuditCycle(auditId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  try {
    await AuditService.closeAuditCycle(auditId, user);
    revalidatePath("/audits");
    revalidatePath(`/audits/${auditId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return toResult(error);
  }
}

export async function previewAuditScope(input: {
  departmentId: string | null;
  location: string | null;
}): Promise<ActionResult<{ assetCount: number }>> {
  const user = await requireCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  const assetCount = await previewAuditAssetCount(input);
  return { success: true, data: { assetCount } };
}
