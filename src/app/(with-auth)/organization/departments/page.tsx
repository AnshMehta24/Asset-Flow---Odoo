import { DepartmentList } from "./_components/department-list";
import { DepartmentScreen } from "./_components/department-screen";
import { getDepartmentList } from "./_lib/department-data";
import { requireCurrentUser } from "@/lib/auth/user";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/ui/pagination";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
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
  const page = Number(resolvedSearchParams.page) || 1;

  const { departments, totalCount, totalPages } = await getDepartmentList({
    search,
    status,
    page,
  });

  return (
    <DepartmentScreen search={search} status={status}>
      <div className="flex flex-col gap-4">
        <DepartmentList departments={departments} />
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </DepartmentScreen>
  );
}
