import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAuditDiscrepancies, getAuditCycleSummary } from "@/lib/audits/audit.queries";
import { generateDiscrepancyCSV } from "@/lib/audits/audit.report";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const user = await requireCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { auditId } = await params;

  try {
    const summary = await getAuditCycleSummary(auditId, user);
    if (!summary) {
      return new NextResponse("Audit cycle not found", { status: 404 });
    }

    const items = await getAuditDiscrepancies(auditId, {}, user);
    const csvContent = generateDiscrepancyCSV(summary.audit, items);

    const safeName = summary.audit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${safeName}-discrepancies.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === "AUDIT_FORBIDDEN") {
      return new NextResponse("Access denied", { status: 403 });
    }
    return new NextResponse(error.message || "Failed to generate report", { status: 500 });
  }
}
