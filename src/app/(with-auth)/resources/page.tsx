import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/user";
import { getAllocationList } from "../allocations/_lib/allocation-data";
import { ResourcesList } from "./_components/resources-list";
import { Laptop, RotateCcw, Box } from "lucide-react";

export const metadata = { title: "My Resources — AssetFlow" };

export default async function MyResourcesPage() {
  const user = await requireCurrentUser();
  if (!user) redirect("/login");

  // Fetch all allocations (active and returned) for this user (up to 100)
  const { allocations } = await getAllocationList({
    employeeId: user.id,
    status: "ALL",
  });

  const activeAllocations = allocations.filter((a) => a.status === "ACTIVE");
  const pendingReturns = activeAllocations.filter((a) => !!a.returnRequestedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your currently active assets and manage your return requests.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="rounded-xl p-3 bg-primary/10 text-primary">
            <Laptop className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{activeAllocations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Assets</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="rounded-xl p-3 bg-amber-500/10 text-amber-500">
            <RotateCcw className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{pendingReturns.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending Returns</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="rounded-xl p-3 bg-slate-500/10 text-slate-500">
            <Box className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">
              {allocations.filter((a) => a.status === "RETURNED").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Returned Assets</p>
          </div>
        </div>
      </div>

      {/* List of allocations */}
      <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
        <ResourcesList initialAllocations={allocations} />
      </div>
    </div>
  );
}
