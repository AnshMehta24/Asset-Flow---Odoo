import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { AuditService } from "@/lib/audits/audit.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await params;

  try {
    const started = await AuditService.startAuditCycle(auditId, user);
    return NextResponse.json({ data: started });
  } catch (error: any) {
    if (error.message === "AUDIT_NOT_FOUND") {
      return NextResponse.json({ error: "Audit cycle not found" }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (
      error.message === "AUDIT_NOT_PLANNED" ||
      error.message === "AUDIT_HAS_NO_ASSETS" ||
      error.message === "AUDIT_HAS_NO_AUDITORS"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to start audit cycle" }, { status: 500 });
  }
}
