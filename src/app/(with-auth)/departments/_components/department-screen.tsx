import { DepartmentFilters } from "./department-filters";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";

export function DepartmentScreen({
  children,
  search,
  status,
  showFilters = true,
}: {
  children: React.ReactNode;
  search: string;
  status: "ALL" | "ACTIVE" | "INACTIVE";
  showFilters?: boolean;
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-5">
        <OrganizationSetupTabs activeTab="departments" />
        {showFilters && (
          <DepartmentFilters
            key={`${search}:${status}`}
            initialSearch={search}
            initialStatus={status}
          />
        )}
        {children}
      </div>
    </div>
  );
}

