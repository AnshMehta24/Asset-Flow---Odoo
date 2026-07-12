import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAuditDiscrepancies } from "@/lib/audits/audit.queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { auditId } = await params;
  const { searchParams } = new URL(request.url);
  const resolutionStatus = searchParams.get("resolutionStatus") || undefined;

  try {
    const data = await getAuditDiscrepancies(auditId, { resolutionStatus }, user);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "AUDIT_NOT_FOUND") {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch discrepancies" }, { status: 500 });
  }
}
