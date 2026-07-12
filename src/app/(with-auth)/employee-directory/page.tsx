import { EmployeeDirectoryFilters } from "./_components/employee-directory-filters";
import { EmployeeDirectoryList } from "./_components/employee-directory-list";
import { getEmployeeDirectoryList } from "./_lib/employee-directory-data";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";
import { getCurrentUser } from "@/lib/auth/user";

export default async function EmployeeDirectoryPage({
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

  const [employees, currentUser] = await Promise.all([
    getEmployeeDirectoryList({
      search,
      status,
    }),
    getCurrentUser(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="employees" />
      <EmployeeDirectoryFilters
        key={`${search}:${status}`}
        initialSearch={search}
        initialStatus={status}
      />
      <EmployeeDirectoryList
        employees={employees}
        currentUserId={currentUser?.id}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}

