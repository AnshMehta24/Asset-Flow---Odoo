// Mock Data Layer based on prisma/schema.prisma

export enum Role {
  ADMIN = "ADMIN",
  ASSET_MANAGER = "ASSET_MANAGER",
  DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
  EMPLOYEE = "EMPLOYEE",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum DepartmentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  ALLOCATED = "ALLOCATED",
  RESERVED = "RESERVED",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
  LOST = "LOST",
  RETIRED = "RETIRED",
  DISPOSED = "DISPOSED",
}

export enum AssetCondition {
  NEW = "NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
  DAMAGED = "DAMAGED",
}

export enum AllocationStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
}

export enum BookingStatus {
  UPCOMING = "UPCOMING",
  ONGOING = "ONGOING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum MaintenancePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum MaintenanceStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
}

export interface Department {
  id: string;
  name: string;
  status: DepartmentStatus;
  headId: string | null;
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface Asset {
  id: string;
  tagNumber: number; // e.g. 87 -> formatted as AF-0087
  name: string;
  serialNumber: string | null;
  acquisitionDate: Date;
  acquisitionCost: number;
  condition: AssetCondition;
  status: AssetStatus;
  location: string | null;
  isBookable: boolean;
  categoryId: string;
  departmentId: string | null;
  registeredById: string;
  createdAt: Date;
}

export interface Allocation {
  id: string;
  status: AllocationStatus;
  assetId: string;
  employeeId: string | null;
  departmentId: string | null;
  allocatedById: string;
  allocatedAt: Date;
  expectedReturnDate: Date | null;
  returnedAt: Date | null;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  assetId: string;
  bookedById: string;
  departmentId: string | null;
  startTime: Date;
  endTime: Date;
  purpose: string | null;
}

export interface MaintenanceRequest {
  id: string;
  status: MaintenanceStatus;
  assetId: string;
  raisedById: string;
  issueDescription: string;
  priority: MaintenancePriority;
  scheduledDate: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

// Helper to format tag numbers like AF-0087
export function formatSequenceNo(tagNumber: number): string {
  return `AF-${String(tagNumber).padStart(4, "0")}`;
}

// Mock Data Definitions
export const mockDepartments: Department[] = [
  { id: "dept-1", name: "Engineering & IT Support", status: DepartmentStatus.ACTIVE, headId: "user-2" },
  { id: "dept-2", name: "Research & Development", status: DepartmentStatus.ACTIVE, headId: "user-3" },
  { id: "dept-3", name: "Operations & Logistics", status: DepartmentStatus.ACTIVE, headId: "user-4" },
  { id: "dept-4", name: "Marketing & Sales", status: DepartmentStatus.ACTIVE, headId: "user-5" },
  { id: "dept-5", name: "Human Resources", status: DepartmentStatus.ACTIVE, headId: "user-6" },
];

export const mockCategories: AssetCategory[] = [
  { id: "cat-1", name: "IT Equipment", description: "Laptops, monitors, keyboards, servers" },
  { id: "cat-2", name: "Vehicles", description: "Company transport vehicles, vans" },
  { id: "cat-3", name: "Facilities & Space", description: "Meeting rooms, conference halls" },
  { id: "cat-4", name: "Machinery & Tools", description: "Heavy machinery, forklifts, tools" },
  { id: "cat-5", name: "Office Furniture", description: "Chairs, desks, office cabinets" },
];

export const mockUsers: User[] = [
  { id: "user-1", name: "System Admin", email: "admin@assetflow.com", role: Role.ADMIN, status: UserStatus.ACTIVE, departmentId: null },
  { id: "user-2", name: "Sarah Connor", email: "sconnor@assetflow.com", role: Role.DEPARTMENT_HEAD, status: UserStatus.ACTIVE, departmentId: "dept-1" },
  { id: "user-3", name: "Bruce Banner", email: "bbanner@assetflow.com", role: Role.DEPARTMENT_HEAD, status: UserStatus.ACTIVE, departmentId: "dept-2" },
  { id: "user-4", name: "Clark Kent", email: "ckent@assetflow.com", role: Role.DEPARTMENT_HEAD, status: UserStatus.ACTIVE, departmentId: "dept-3" },
  { id: "user-5", name: "Tony Stark", email: "tstark@assetflow.com", role: Role.DEPARTMENT_HEAD, status: UserStatus.ACTIVE, departmentId: "dept-4" },
  { id: "user-6", name: "Peter Parker", email: "pparker@assetflow.com", role: Role.EMPLOYEE, status: UserStatus.ACTIVE, departmentId: "dept-5" },
];

// Seed dates relative to current time
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

export const mockAssets: Asset[] = [
  // Heavy Machinery
  {
    id: "asset-1",
    tagNumber: 87, // AF-0087
    name: "Heavy Duty Forklift v3",
    serialNumber: "SN-FL-90812",
    acquisitionDate: daysAgo(730),
    acquisitionCost: 45000.00,
    condition: AssetCondition.FAIR,
    status: AssetStatus.UNDER_MAINTENANCE,
    location: "Warehouse Bay A",
    isBookable: false,
    categoryId: "cat-4",
    departmentId: "dept-3",
    registeredById: "user-1",
    createdAt: daysAgo(730),
  },
  // Laptops
  {
    id: "asset-2",
    tagNumber: 20, // AF-0020
    name: "MacBook Pro 15\" (Intel Core i9)",
    serialNumber: "SN-MBP-4820",
    acquisitionDate: daysAgo(1465), // 4 years old
    acquisitionCost: 2800.00,
    condition: AssetCondition.POOR,
    status: AssetStatus.ALLOCATED,
    location: "IT HQ",
    isBookable: false,
    categoryId: "cat-1",
    departmentId: "dept-1",
    registeredById: "user-1",
    createdAt: daysAgo(1465),
  },
  {
    id: "asset-3",
    tagNumber: 101, // AF-0101
    name: "Dell XPS 15 9520",
    serialNumber: "SN-DELL-10029",
    acquisitionDate: daysAgo(365),
    acquisitionCost: 1850.00,
    condition: AssetCondition.NEW,
    status: AssetStatus.ALLOCATED,
    location: "R&D Lab",
    isBookable: false,
    categoryId: "cat-1",
    departmentId: "dept-2",
    registeredById: "user-1",
    createdAt: daysAgo(365),
  },
  // Vehicles
  {
    id: "asset-4",
    tagNumber: 343, // AF-0343
    name: "Transit Delivery Van",
    serialNumber: "SN-VAN-29381",
    acquisitionDate: daysAgo(900),
    acquisitionCost: 32000.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.ALLOCATED,
    location: "Garage Slot 4",
    isBookable: true,
    categoryId: "cat-2",
    departmentId: "dept-3",
    registeredById: "user-1",
    createdAt: daysAgo(900),
  },
  // Rooms
  {
    id: "asset-5",
    tagNumber: 2, // AF-0002 -> Room B2
    name: "Conference Room B2 (Large)",
    serialNumber: null,
    acquisitionDate: daysAgo(1800),
    acquisitionCost: 12000.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.AVAILABLE,
    location: "Building B, 2nd Floor",
    isBookable: true,
    categoryId: "cat-3",
    departmentId: "dept-1",
    registeredById: "user-1",
    createdAt: daysAgo(1800),
  },
  // Projector
  {
    id: "asset-6",
    tagNumber: 335, // AF-0335
    name: "Epson 4K Projector Pro",
    serialNumber: "SN-EPSON-3351",
    acquisitionDate: daysAgo(400),
    acquisitionCost: 1500.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.AVAILABLE,
    location: "IT Storage Room",
    isBookable: true,
    categoryId: "cat-1",
    departmentId: "dept-1",
    registeredById: "user-1",
    createdAt: daysAgo(400),
  },
  // Camera - Idle Asset (unused for 60+ days)
  {
    id: "asset-7",
    tagNumber: 301, // AF-0301
    name: "Sony Alpha A7 IV Camera",
    serialNumber: "SN-SONY-7301",
    acquisitionDate: daysAgo(500),
    acquisitionCost: 2500.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.AVAILABLE,
    location: "Media Cabinet 2",
    isBookable: true,
    categoryId: "cat-1",
    departmentId: "dept-4",
    registeredById: "user-1",
    createdAt: daysAgo(500),
  },
  // Chair - Idle Asset (unused for 45 days)
  {
    id: "asset-8",
    tagNumber: 410, // AF-0410
    name: "Herman Miller Aeron Chair",
    serialNumber: "SN-HM-41029",
    acquisitionDate: daysAgo(600),
    acquisitionCost: 1200.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.AVAILABLE,
    location: "HR Office 3",
    isBookable: false,
    categoryId: "cat-5",
    departmentId: "dept-5",
    registeredById: "user-1",
    createdAt: daysAgo(600),
  },
  // Additional assets for statistics
  {
    id: "asset-9",
    tagNumber: 12,
    name: "MacBook Air M2",
    serialNumber: "SN-MBA-9912",
    acquisitionDate: daysAgo(200),
    acquisitionCost: 1200.00,
    condition: AssetCondition.NEW,
    status: AssetStatus.ALLOCATED,
    location: "HR Room",
    isBookable: false,
    categoryId: "cat-1",
    departmentId: "dept-5",
    registeredById: "user-1",
    createdAt: daysAgo(200),
  },
  {
    id: "asset-10",
    tagNumber: 45,
    name: "iPad Pro 12.9\"",
    serialNumber: "SN-IPAD-0045",
    acquisitionDate: daysAgo(350),
    acquisitionCost: 1100.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.ALLOCATED,
    location: "Marketing Studio",
    isBookable: false,
    categoryId: "cat-1",
    departmentId: "dept-4",
    registeredById: "user-1",
    createdAt: daysAgo(350),
  },
  {
    id: "asset-11",
    tagNumber: 73,
    name: "Development Server Rack",
    serialNumber: "SN-SRV-7733",
    acquisitionDate: daysAgo(800),
    acquisitionCost: 15000.00,
    condition: AssetCondition.FAIR,
    status: AssetStatus.ALLOCATED,
    location: "IT Server Room B",
    isBookable: false,
    categoryId: "cat-1",
    departmentId: "dept-1",
    registeredById: "user-1",
    createdAt: daysAgo(800),
  },
  {
    id: "asset-12",
    tagNumber: 15,
    name: "Conference Room A1",
    serialNumber: null,
    acquisitionDate: daysAgo(1000),
    acquisitionCost: 8000.00,
    condition: AssetCondition.GOOD,
    status: AssetStatus.AVAILABLE,
    location: "HQ Floor 1",
    isBookable: true,
    categoryId: "cat-3",
    departmentId: "dept-1",
    registeredById: "user-1",
    createdAt: daysAgo(1000),
  },
  {
    id: "asset-13",
    tagNumber: 62,
    name: "Laser Cutter 50W",
    serialNumber: "SN-CUT-9018",
    acquisitionDate: daysAgo(550),
    acquisitionCost: 9500.00,
    condition: AssetCondition.FAIR,
    status: AssetStatus.ALLOCATED,
    location: "R&D Prototype Lab",
    isBookable: false,
    categoryId: "cat-4",
    departmentId: "dept-2",
    registeredById: "user-1",
    createdAt: daysAgo(550),
  },
  {
    id: "asset-14",
    tagNumber: 18,
    name: "Logistics Box Truck",
    serialNumber: "SN-TRK-7711",
    acquisitionDate: daysAgo(1200),
    acquisitionCost: 48000.00,
    condition: AssetCondition.POOR,
    status: AssetStatus.ALLOCATED,
    location: "Outer Loading Dock",
    isBookable: false,
    categoryId: "cat-2",
    departmentId: "dept-3",
    registeredById: "user-1",
    createdAt: daysAgo(1200),
  }
];

export const mockAllocations: Allocation[] = [
  {
    id: "alloc-1",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-2", // Laptop MB
    employeeId: "user-2",
    departmentId: "dept-1",
    allocatedById: "user-1",
    allocatedAt: daysAgo(365),
    expectedReturnDate: daysAhead(180),
    returnedAt: null,
  },
  {
    id: "alloc-2",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-3", // Dell XPS
    employeeId: "user-3",
    departmentId: "dept-2",
    allocatedById: "user-1",
    allocatedAt: daysAgo(120),
    expectedReturnDate: daysAhead(200),
    returnedAt: null,
  },
  {
    id: "alloc-3",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-4", // Van
    employeeId: "user-4",
    departmentId: "dept-3",
    allocatedById: "user-1",
    allocatedAt: daysAgo(50),
    expectedReturnDate: daysAhead(10),
    returnedAt: null,
  },
  {
    id: "alloc-4",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-9", // MacBook Air
    employeeId: "user-6",
    departmentId: "dept-5",
    allocatedById: "user-1",
    allocatedAt: daysAgo(180),
    expectedReturnDate: null,
    returnedAt: null,
  },
  {
    id: "alloc-5",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-10", // iPad
    employeeId: "user-5",
    departmentId: "dept-4",
    allocatedById: "user-1",
    allocatedAt: daysAgo(60),
    expectedReturnDate: null,
    returnedAt: null,
  },
  {
    id: "alloc-6",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-11", // Server Rack
    employeeId: null,
    departmentId: "dept-1",
    allocatedById: "user-1",
    allocatedAt: daysAgo(700),
    expectedReturnDate: null,
    returnedAt: null,
  },
  {
    id: "alloc-7",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-13", // Laser Cutter
    employeeId: "user-3",
    departmentId: "dept-2",
    allocatedById: "user-1",
    allocatedAt: daysAgo(200),
    expectedReturnDate: null,
    returnedAt: null,
  },
  {
    id: "alloc-8",
    status: AllocationStatus.ACTIVE,
    assetId: "asset-14", // Box Truck
    employeeId: "user-4",
    departmentId: "dept-3",
    allocatedById: "user-1",
    allocatedAt: daysAgo(150),
    expectedReturnDate: daysAhead(30),
    returnedAt: null,
  },
];

// Rich set of bookings to drive statistics
export const mockBookings: Booking[] = [
  // Room B2 bookings (Most Used)
  ...Array.from({ length: 34 }, (_, i) => ({
    id: `book-b2-${i}`,
    status: BookingStatus.COMPLETED,
    assetId: "asset-5", // Room B2
    bookedById: "user-2",
    departmentId: "dept-1",
    startTime: daysAgo(i % 30),
    endTime: daysAgo(i % 30),
    purpose: `Weekly sync ${i}`,
  })),
  // Transit Van bookings
  ...Array.from({ length: 21 }, (_, i) => ({
    id: `book-van-${i}`,
    status: BookingStatus.COMPLETED,
    assetId: "asset-4", // Van
    bookedById: "user-4",
    departmentId: "dept-3",
    startTime: daysAgo(i % 25),
    endTime: daysAgo(i % 25),
    purpose: `Delivery Run ${i}`,
  })),
  // Projector bookings
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `book-proj-${i}`,
    status: BookingStatus.COMPLETED,
    assetId: "asset-6", // Projector
    bookedById: "user-5",
    departmentId: "dept-4",
    startTime: daysAgo(i % 20),
    endTime: daysAgo(i % 20),
    purpose: `Presentation ${i}`,
  })),
  // Conference Room A1 bookings
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `book-a1-${i}`,
    status: BookingStatus.COMPLETED,
    assetId: "asset-12", // Room A1
    bookedById: "user-3",
    departmentId: "dept-2",
    startTime: daysAgo(i % 15),
    endTime: daysAgo(i % 15),
    purpose: `Design Sprint ${i}`,
  })),
];

export const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: "maint-1",
    status: MaintenanceStatus.PENDING,
    assetId: "asset-1", // Forklift
    raisedById: "user-4",
    issueDescription: "Hydraulic pump fluid leaking. Fork movement sluggish.",
    priority: MaintenancePriority.HIGH,
    scheduledDate: daysAhead(5), // Due in 5 days!
    resolvedAt: null,
    createdAt: daysAgo(3),
  },
  {
    id: "maint-2",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-4", // Van
    raisedById: "user-4",
    issueDescription: "Oil change and tire rotation.",
    priority: MaintenancePriority.LOW,
    scheduledDate: daysAgo(10),
    resolvedAt: daysAgo(10),
    createdAt: daysAgo(12),
  },
  {
    id: "maint-3",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-2", // Laptop MBP
    raisedById: "user-2",
    issueDescription: "Keyboard key sticky, screen flickering.",
    priority: MaintenancePriority.MEDIUM,
    scheduledDate: daysAgo(60),
    resolvedAt: daysAgo(58),
    createdAt: daysAgo(65),
  },
  {
    id: "maint-4",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-6", // Projector
    raisedById: "user-5",
    issueDescription: "Bulb replaced.",
    priority: MaintenancePriority.MEDIUM,
    scheduledDate: daysAgo(120),
    resolvedAt: daysAgo(119),
    createdAt: daysAgo(121),
  },
  {
    id: "maint-5",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-11", // Server Rack
    raisedById: "user-2",
    issueDescription: "Power supply unit failure.",
    priority: MaintenancePriority.CRITICAL,
    scheduledDate: daysAgo(90),
    resolvedAt: daysAgo(89),
    createdAt: daysAgo(90),
  },
  {
    id: "maint-6",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-14", // Box truck
    raisedById: "user-4",
    issueDescription: "Brake pads replacement.",
    priority: MaintenancePriority.HIGH,
    scheduledDate: daysAgo(30),
    resolvedAt: daysAgo(30),
    createdAt: daysAgo(32),
  },
  {
    id: "maint-7",
    status: MaintenanceStatus.RESOLVED,
    assetId: "asset-1", // Forklift
    raisedById: "user-4",
    issueDescription: "Battery charge issues.",
    priority: MaintenancePriority.MEDIUM,
    scheduledDate: daysAgo(250),
    resolvedAt: daysAgo(250),
    createdAt: daysAgo(255),
  },
];

// Operational Selector Calculators
export interface DepartmentUtilization {
  departmentId: string;
  departmentName: string;
  totalAssets: number;
  allocatedAssets: number;
  utilizationRate: number;
}

export function getDepartmentUtilization(): DepartmentUtilization[] {
  return mockDepartments.map((dept) => {
    const totalAssets = mockAssets.filter((asset) => asset.departmentId === dept.id).length;
    const allocatedAssets = mockAssets.filter(
      (asset) => asset.departmentId === dept.id && asset.status === AssetStatus.ALLOCATED
    ).length;

    return {
      departmentId: dept.id,
      departmentName: dept.name.split(" ")[0], // Shorter name for charts
      totalAssets,
      allocatedAssets,
      utilizationRate: totalAssets > 0 ? Math.round((allocatedAssets / totalAssets) * 100) : 0,
    };
  });
}

export interface MonthlyMaintenanceCount {
  month: string; // E.g., "Jan"
  count: number;
}

export function getMaintenanceFrequency(): MonthlyMaintenanceCount[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const counts: Record<string, number> = {};

  // Initialize past 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = months[d.getMonth()];
    counts[label] = 0;
  }

  // Count resolved requests that fall in these months
  mockMaintenanceRequests.forEach((req) => {
    if (req.resolvedAt) {
      const monthLabel = months[req.resolvedAt.getMonth()];
      if (counts[monthLabel] !== undefined) {
        counts[monthLabel]++;
      }
    }
  });

  return Object.entries(counts).map(([month, count]) => ({ month, count }));
}

export interface MostUsedAssetSummary {
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  bookingCount: number;
  detail: string;
}

export function getMostUsedAssets(limit = 3): MostUsedAssetSummary[] {
  const bookingCounts: Record<string, number> = {};

  mockBookings.forEach((b) => {
    bookingCounts[b.assetId] = (bookingCounts[b.assetId] || 0) + 1;
  });

  const sorted = Object.entries(bookingCounts)
    .map(([assetId, count]) => {
      const asset = mockAssets.find((a) => a.id === assetId);
      return {
        assetId,
        assetName: asset?.name || "Unknown Asset",
        tagNumberFormatted: asset ? formatSequenceNo(asset.tagNumber) : "AF-0000",
        bookingCount: count,
        detail:
          assetId === "asset-5"
            ? `${count} bookings this month`
            : assetId === "asset-4"
            ? `${count} trips this month`
            : `${count} uses`,
      };
    })
    .sort((a, b) => b.bookingCount - a.bookingCount);

  return sorted.slice(0, limit);
}

export interface IdleAssetSummary {
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  daysIdle: number;
  detail: string;
}

export function getIdleAssets(): IdleAssetSummary[] {
  return [
    {
      assetId: "asset-7",
      assetName: "Sony Alpha A7 IV Camera",
      tagNumberFormatted: formatSequenceNo(301),
      daysIdle: 60,
      detail: "unused 60+ days",
    },
    {
      assetId: "asset-8",
      assetName: "Herman Miller Aeron Chair",
      tagNumberFormatted: formatSequenceNo(410),
      daysIdle: 45,
      detail: "unused 45 days",
    },
  ];
}

export interface OperationalAlert {
  type: "MAINTENANCE" | "RETIREMENT";
  assetId: string;
  assetName: string;
  tagNumberFormatted: string;
  message: string;
  daysRemainingOrAge: number;
  priority: string;
}

export function getOperationalAlerts(): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];

  // 1. Maintenance alerts (Pending maintenance requests due soon)
  mockMaintenanceRequests.forEach((req) => {
    if (req.status === MaintenanceStatus.PENDING && req.scheduledDate) {
      const diffTime = req.scheduledDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const asset = mockAssets.find((a) => a.id === req.assetId);

      if (asset && diffDays > 0 && diffDays <= 7) {
        alerts.push({
          type: "MAINTENANCE",
          assetId: asset.id,
          assetName: asset.name,
          tagNumberFormatted: formatSequenceNo(asset.tagNumber),
          message: `service due in ${diffDays} days`,
          daysRemainingOrAge: diffDays,
          priority: req.priority,
        });
      }
    }
  });

  // 2. Retirement alerts (assets nearing retirement based on age)
  mockAssets.forEach((asset) => {
    const ageInYears = (now.getTime() - asset.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    let nearingRetirement = false;

    // Laptops older than 3.5 years
    if (asset.categoryId === "cat-1" && ageInYears >= 3.5) {
      nearingRetirement = true;
    }
    // Heavy equipment older than 6 years
    else if (asset.categoryId === "cat-4" && ageInYears >= 6.0) {
      nearingRetirement = true;
    }

    if (nearingRetirement) {
      alerts.push({
        type: "RETIREMENT",
        assetId: asset.id,
        assetName: asset.name,
        tagNumberFormatted: formatSequenceNo(asset.tagNumber),
        message: `${Math.floor(ageInYears)} years old : nearing retirement`,
        daysRemainingOrAge: Math.round(ageInYears * 10) / 10,
        priority: "MEDIUM",
      });
    }
  });

  return alerts;
}

export interface HeatmapCell {
  day: string; // "Mon", "Tue", etc.
  timeSlot: string; // "Morning", "Afternoon", etc.
  density: number; // 0 to 100 representing percentage booking density
}

export function getBookingHeatmap(): HeatmapCell[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const timeSlots = [
    "Morning (9-11 AM)",
    "Mid-day (11-1 PM)",
    "Afternoon (1-3 PM)",
    "Late Afternoon (3-5 PM)",
    "Evening (5-7 PM)",
    "Night (7-9 PM)",
  ];

  const cellData: HeatmapCell[] = [];

  const baseDensities: Record<string, number[]> = {
    Mon: [40, 70, 85, 60, 30, 10],
    Tue: [65, 80, 95, 75, 45, 15],
    Wed: [55, 75, 90, 80, 50, 20],
    Thu: [60, 85, 88, 70, 40, 10],
    Fri: [45, 60, 70, 50, 25, 5],
    Sat: [10, 15, 20, 15, 10, 5],
    Sun: [5, 5, 10, 10, 5, 0],
  };

  days.forEach((day) => {
    timeSlots.forEach((slot, idx) => {
      cellData.push({
        day,
        timeSlot: slot,
        density: baseDensities[day][idx],
      });
    });
  });

  return cellData;
}

export interface DepartmentAllocationSummary {
  departmentName: string;
  totalAssets: number;
  activeAllocations: number;
  totalCost: number;
  availabilityRate: number;
}

export function getDepartmentAllocationSummary(): DepartmentAllocationSummary[] {
  return mockDepartments.map((dept) => {
    const assets = mockAssets.filter((a) => a.departmentId === dept.id);
    const allocated = assets.filter((a) => a.status === AssetStatus.ALLOCATED).length;
    const cost = assets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
    const available = assets.filter((a) => a.status === AssetStatus.AVAILABLE).length;
    const rate = assets.length > 0 ? Math.round((available / assets.length) * 100) : 100;

    return {
      departmentName: dept.name,
      totalAssets: assets.length,
      activeAllocations: allocated,
      totalCost: cost,
      availabilityRate: rate,
    };
  });
}
