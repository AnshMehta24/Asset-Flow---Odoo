import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAuditCycleSummary } from "@/lib/audits/audit.queries";
import { AuditService } from "@/lib/audits/audit.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await params;

  try {
    const summary = await getAuditCycleSummary(auditId, user);
    if (!summary) {
      return NextResponse.json({ error: "Audit cycle not found" }, { status: 404 });
    }
    return NextResponse.json(summary);
  } catch (error: any) {
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch audit summary" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await params;

  try {
    const body = await request.json();
    const updated = await AuditService.updateAuditCycle(auditId, body, user);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.message === "AUDIT_NOT_FOUND") {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (
      error.message === "AUDIT_HAS_NO_ASSETS" ||
      error.message === "AUDIT_HAS_NO_AUDITORS" ||
      error.message === "INVALID_AUDIT_SCOPE" ||
      error.message === "AUDIT_NOT_PLANNED"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update audit cycle" }, { status: 500 });
  }
}
