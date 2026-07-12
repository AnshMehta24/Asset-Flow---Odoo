import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAuditCyclesForUser } from "@/lib/audits/audit.queries";
import { AuditService } from "@/lib/audits/audit.service";

export async function GET(request: Request) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const assignedToMe = searchParams.get("assignedToMe") === "true";

  try {
    const cycles = await getAuditCyclesForUser(
      { search, status, departmentId, assignedToMe },
      user
    );
    return NextResponse.json(cycles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch audits" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const cycle = await AuditService.createAuditCycle(body, user);
    return NextResponse.json({ data: { id: cycle.id } });
  } catch (error: any) {
    console.error("Create audit error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    if (error.message === "AUDIT_FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (error.message === "AUDIT_HAS_NO_ASSETS" || error.message === "AUDIT_HAS_NO_AUDITORS" || error.message === "INVALID_AUDIT_SCOPE") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create audit cycle" }, { status: 500 });
  }
}
