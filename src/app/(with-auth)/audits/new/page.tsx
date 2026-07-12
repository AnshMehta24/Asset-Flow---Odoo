import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/user";
import { canCreateAudit } from "@/lib/audits/audit.permissions";
import { getAuditFormOptions } from "../_lib/audit-data";
import { AuditCycleForm } from "../_components/audit-cycle-form";

export const metadata = {
  title: "New Audit Cycle — AssetFlow",
};

export default async function NewAuditCyclePage() {
  const user = await getCurrentUser();
  if (!user || !canCreateAudit(user)) {
    redirect("/audits");
  }

  const { departments, users } = await getAuditFormOptions();

  return (
    <div className="flex flex-col gap-6 max-w-5xl w-full">
      <div>
        <Link
          href="/audits"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Audits List</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Audit Cycle</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Initialize a physical equipment checking checklist snapshot</p>
      </div>

      <div className="pt-2">
        <AuditCycleForm departments={departments} users={users} />
      </div>
    </div>
  );
}
