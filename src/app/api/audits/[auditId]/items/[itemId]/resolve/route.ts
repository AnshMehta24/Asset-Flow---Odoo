import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { AuditService } from "@/lib/audits/audit.service";

export async function POST(
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
    const updated = await AuditService.resolveAuditDiscrepancy(auditId, itemId, body, user);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("Resolve discrepancy error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.message === "AUDIT_NOT_FOUND" || error.message === "AUDIT_ITEM_NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (error.message === "AUDIT_NOT_IN_PROGRESS" || error.message === "INVALID_DISCREPANCY_STATE") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to resolve discrepancy" }, { status: 500 });
  }
}
