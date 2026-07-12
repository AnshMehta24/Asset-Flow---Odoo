import { EmployeeDirectoryFilters } from "./_components/employee-directory-filters";
import { EmployeeDirectoryList } from "./_components/employee-directory-list";
import { getEmployeeDirectoryList } from "./_lib/employee-directory-data";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";
import { requireCurrentUser } from "@/lib/auth/user";
import { AccessDenied } from "@/components/access-denied";
import prisma from "@/lib/prisma";
import { Pagination } from "@/components/ui/pagination";

export default async function EmployeeDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const authedUser = await requireCurrentUser();

  if (authedUser?.role !== "ADMIN") {
    return <AccessDenied message="Only Admins can view the employee directory." />;
  }

  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const status =
    resolvedSearchParams.status === "ACTIVE" ||
      resolvedSearchParams.status === "INACTIVE"
      ? resolvedSearchParams.status
      : "ALL";
  const page = Number(resolvedSearchParams.page) || 1;

  const [employeesData, departments] = await Promise.all([
    getEmployeeDirectoryList({
      search,
      status,
      page,
    }),
    prisma.department.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="employees" />
      <EmployeeDirectoryFilters
        key={`${search}:${status}`}
        initialSearch={search}
        initialStatus={status}
      />
      <div className="flex flex-col gap-4">
        <EmployeeDirectoryList
          employees={employeesData.employees}
          currentUserId={authedUser.id}
          currentUserRole={authedUser.role}
          departments={departments}
        />
        <Pagination currentPage={page} totalPages={employeesData.totalPages} totalCount={employeesData.totalCount} />
      </div>
    </div>
  );
}