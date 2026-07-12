import {
  LayoutDashboard,
  Building2,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
} from "lucide-react";
import type { Role } from "../../generated/prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const ALL_ROLES: Role[] = [
  "ADMIN",
  "ASSET_MANAGER",
  "DEPARTMENT_HEAD",
  "EMPLOYEE",
];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    label: "Organization Setup",
    href: "/organization",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    label: "Assets",
    href: "/assets",
    icon: Boxes,
    roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"],
  },
  {
    label: "Allocation & Transfer",
    href: "/allocations",
    icon: ArrowLeftRight,
    roles: ALL_ROLES,
  },
  {
    label: "Resource Booking",
    href: "/resource-booking",
    icon: CalendarClock,
    roles: ALL_ROLES,
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    roles: ALL_ROLES,
  },
  {
    // Audit is assigned per-cycle (any role can be tapped as an auditor), so
    // this static role gate is intentionally narrow for now — an assigned
    // Dept Head/Employee auditor won't see this nav item yet.
    // TODO: fall back to showing this item (scoped to just that cycle) when
    // the current user has an AuditAssignment on an active AuditCycle,
    // regardless of role.
    label: "Audit",
    href: "/audit",
    icon: ClipboardCheck,
    roles: ["ADMIN", "ASSET_MANAGER"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ALL_ROLES,
  },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
