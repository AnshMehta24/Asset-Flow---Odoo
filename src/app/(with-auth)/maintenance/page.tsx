import { getCurrentUser } from "@/lib/auth/user";
import {
  getMaintenanceBoard,
  getRejectedRequests,
  getEligibleAssetsForRaise,
} from "./_lib/maintenance-data";
import { MaintenanceBoard } from "./_components/maintenance-board";
import { MaintenancePriorityBadge } from "./_components/maintenance-priority-badge";
import { RaiseRequestModal } from "./_components/raise-request-modal";

export const metadata = {
  title: "Maintenance — AssetFlow",
  description: "Route repairs through approval before work starts.",
};

export default async function MaintenancePage() {
  const user = await getCurrentUser();
  const canManage = user?.role === "ASSET_MANAGER" || user?.role === "ADMIN";

  const [board, rejected, eligibleAssets] = await Promise.all([
    getMaintenanceBoard(),
    getRejectedRequests(),
    user ? getEligibleAssetsForRaise(user) : Promise.resolve([]),
  ]);

  return (
    <div
      className="flex min-w-0 flex-col gap-5 overflow-x-hidden p-4"
      style={{ contain: "inline-size" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approving a card moves the asset to Under Maintenance; resolving
            returns it to Available.
          </p>
        </div>
        <RaiseRequestModal assets={eligibleAssets} />
      </div>

      <div className="min-h-0 min-w-0 flex-1">
        <MaintenanceBoard board={board} canManage={canManage} />
      </div>

      {rejected.length > 0 && (
        <details className="rounded-lg border border-border bg-sidebar p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Rejected ({rejected.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {rejected.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-background p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {r.assetTag} — {r.assetName}
                  </span>
                  <MaintenancePriorityBadge priority={r.priority} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.issueDescription}
                </p>
                {r.rejectionReason && (
                  <p className="mt-1 text-xs text-destructive">
                    Reason: {r.rejectionReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
