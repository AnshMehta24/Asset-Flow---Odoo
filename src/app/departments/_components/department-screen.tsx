import { DepartmentFilters } from "./department-filters";
import { OrganizationSetupTabs } from "../../organization-setup/_components/organization-setup-tabs";

export function DepartmentScreen({
  children,
  search,
  status,
}: {
  children: React.ReactNode;
  search: string;
  status: "ALL" | "ACTIVE" | "INACTIVE";
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-5">
        <OrganizationSetupTabs activeTab="departments" />
        <DepartmentFilters
          key={`${search}:${status}`}
          initialSearch={search}
          initialStatus={status}
        />

        {children}
      </div>
    </div>
  );
}
