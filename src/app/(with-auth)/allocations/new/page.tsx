import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/user";
import {
  getAvailableAssetsForAllocation,
  getActiveEmployees,
  getActiveDepartments,
} from "../_lib/allocation-data";
import { AllocationForm } from "../_components/allocation-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "New Allocation — AssetFlow" };

export default async function NewAllocationPage() {
  const user = await requireCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "ASSET_MANAGER"].includes(user.role)) redirect("/allocations");

  const [assets, employees, departments] = await Promise.all([
    getAvailableAssetsForAllocation(),
    getActiveEmployees(),
    getActiveDepartments(),
  ]);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/allocations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Allocations
      </Link>

      {assets.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
          <strong>No available assets.</strong> All assets are currently allocated, under
          maintenance, or in another state. Return or retire existing assets first.
        </div>
      )}

      {/* Full-width form card — matches asset-form style */}
      <AllocationForm assets={assets} employees={employees} departments={departments} />
    </div>
  );
}
