import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAuditChecklist } from "@/lib/audits/audit.queries";

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

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
  const search = searchParams.get("search") || undefined;
  const verification = searchParams.get("verification") || undefined;
  const category = searchParams.get("category") || undefined;
  const location = searchParams.get("location") || undefined;
  const checkedByMe = searchParams.get("checkedByMe") === "true";

  try {
    const data = await getAuditChecklist(
      auditId,
      { page, pageSize, search, verification, category, location, checkedByMe },
      user
    );
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "AUDIT_NOT_FOUND") {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch checklist" }, { status: 500 });
  }
}
