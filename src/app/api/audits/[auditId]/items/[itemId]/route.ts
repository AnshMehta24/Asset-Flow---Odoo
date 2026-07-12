import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { AuditService } from "@/lib/audits/audit.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ auditId: string; itemId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId, itemId } = await params;

  try {
    const body = await request.json();
    const updated = await AuditService.verifyAuditItem(auditId, itemId, body, user);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Verify audit item error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.message === "AUDIT_NOT_FOUND" || error.message === "AUDIT_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Failed to verify checklist item" }, { status: 500 });
  }
}
