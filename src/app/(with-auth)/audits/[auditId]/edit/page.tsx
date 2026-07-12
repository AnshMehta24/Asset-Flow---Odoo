import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/user";
import { canEditAudit } from "@/lib/audits/audit.permissions";
import { getAuditFormOptions } from "../../_lib/audit-data";
import { AuditCycleForm } from "../../_components/audit-cycle-form";

export const metadata = {
  title: "Edit Audit Cycle — AssetFlow",
};

export default async function EditAuditCyclePage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/audits");

  const cycle = await prisma.auditCycle.findUnique({
    where: { id: auditId },
    include: { auditors: { select: { auditorId: true } } },
  });

  if (!cycle) notFound();

  if (!canEditAudit(user, cycle)) {
    redirect(`/audits/${auditId}`);
  }

  const { departments, users } = await getAuditFormOptions();

  return (
    <div className="flex flex-col gap-6 max-w-5xl w-full">
      <div>
        <Link
          href={`/audits/${auditId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Audit Details</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Audit Cycle</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modify planned verification settings and scopes</p>
      </div>

      <div className="pt-2">
        <AuditCycleForm
          departments={departments}
          users={users}
          auditId={auditId}
          initialData={{
            name: cycle.name,
            departmentId: cycle.departmentId,
            location: cycle.location,
            startDate: cycle.startDate,
            endDate: cycle.endDate,
            auditorIds: cycle.auditors.map((a) => a.auditorId),
          }}
        />
      </div>
    </div>
  );
}
