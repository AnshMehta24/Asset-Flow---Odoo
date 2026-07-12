import Link from "next/link";

const tabs = [
  {
    key: "departments",
    label: "Departments",
    href: "/organization/departments",
  },
  {
    key: "categories",
    label: "Categories",
    href: "/organization/asset-categories",
  },
  {
    key: "employees",
    label: "Employee",
    href: "/organization/employee-directory",
  },
] as const;

export function OrganizationSetupTabs({
  activeTab,
}: {
  activeTab: "departments" | "categories" | "employees";
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`border px-5 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "border-border bg-muted text-foreground"
              : "border-border bg-background text-muted-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
