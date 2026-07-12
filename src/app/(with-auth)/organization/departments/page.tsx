import { DepartmentList } from "./_components/department-list";
import { DepartmentScreen } from "./_components/department-screen";
import { getDepartmentList } from "./_lib/department-data";
import { requireCurrentUser } from "@/lib/auth/user";
import { AccessDenied } from "@/components/access-denied";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}) {
  const user = await requireCurrentUser();

  if (user?.role !== "ADMIN") {
    return <AccessDenied message="Only Admins can manage departments." />;
  }

  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const status =
    resolvedSearchParams.status === "ACTIVE" ||
    resolvedSearchParams.status === "INACTIVE"
      ? resolvedSearchParams.status
      : "ALL";
  const departments = await getDepartmentList({
    search,
    status,
  });

  return (
    <DepartmentScreen search={search} status={status}>
      <DepartmentList departments={departments} />
    </DepartmentScreen>
  );
}
