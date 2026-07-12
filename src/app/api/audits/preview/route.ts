import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/user";
import { previewAuditAssetCount } from "@/lib/audits/audit.queries";

export async function POST(request: Request) {
  const user = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const count = await previewAuditAssetCount({
      departmentId: body.departmentId || null,
      location: body.location || null,
    });
    return NextResponse.json({ data: { assetCount: count } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to preview scope count" }, { status: 500 });
  }
}
