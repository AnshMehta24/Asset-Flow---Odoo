import Link from "next/link";

const tabs = [
  {
    key: "departments",
    label: "Departments",
    href: "/departments",
  },
  {
    key: "categories",
    label: "Categories",
    href: "/asset-categories",
  },
  {
    key: "employees",
    label: "Employee",
    href: "/employee-directory",
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
          className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors ${
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
