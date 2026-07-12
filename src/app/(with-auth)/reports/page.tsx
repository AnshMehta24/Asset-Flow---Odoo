import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/user";
import { getReportsData } from "./_lib/reports-data";
import { ReportsDashboard } from "./_components/reports-dashboard";

const ALLOWED_ROLES = ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"] as const;

export default async function ReportsPage() {
  const user = await requireCurrentUser();

  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    redirect("/");
  }

  // Dept Head sees a dept-scoped view; Admin/Asset Manager see org-wide.
  const scope = user.role === "DEPARTMENT_HEAD" && user.departmentId
    ? { departmentId: user.departmentId }
    : {};

  const data = await getReportsData(scope);

  return <ReportsDashboard data={data} />;
}
