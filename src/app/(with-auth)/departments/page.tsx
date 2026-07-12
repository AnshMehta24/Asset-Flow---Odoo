import { DepartmentList } from "./_components/department-list";
import { DepartmentScreen } from "./_components/department-screen";
import { getDepartmentList } from "./_lib/department-data";

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}) {
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
