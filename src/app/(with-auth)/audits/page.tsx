import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/user";
import { getAuditCyclesForUser } from "@/lib/audits/audit.queries";
import { AuditFiltersBar } from "./_components/audit-filters-bar";
import { AuditGrid } from "./_components/audit-grid";

export const metadata = {
  title: "Audit Cycles — AssetFlow",
  description: "Manage and track physical resource verification checklists.",
};

export default async function AuditsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    assignedToMe?: string;
  }>;
}) {
  const resolved = await searchParams;
  const search = resolved.search?.trim() ?? "";
  const status = resolved.status ?? "ALL";
  const assignedToMe = resolved.assignedToMe === "true";

  const user = await getCurrentUser();
  if (!user) return null;

  const cycles = await getAuditCyclesForUser(
    { search, status: status === "ALL" ? undefined : status, assignedToMe },
    user
  );

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Asset Verification Audits
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage and track physical resource verification checklists
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/audits/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold rounded-lg shadow active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Audit Cycle</span>
          </Link>
        )}
      </div>

      <AuditFiltersBar
        initialSearch={search}
        initialStatus={status}
        initialAssignedToMe={assignedToMe}
      />

      {cycles.length === 0 ? (
        <div className="py-24 border border-border border-dashed rounded-xl text-center bg-card">
          <ClipboardCheck size={40} className="mx-auto mb-4 opacity-40 text-muted-foreground" />
          <h3 className="font-bold text-base text-foreground">No audit cycles found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {search || status !== "ALL" || assignedToMe
              ? "Try adjusting your search query or filters to find cycles."
              : "Generate an audit cycle to begin physical resource verification."}
          </p>
        </div>
      ) : (
        <AuditGrid cycles={cycles} isAdmin={isAdmin} />
      )}
    </div>
  );
}
