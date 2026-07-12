import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PASSWORD_SALT_ROUNDS = 12;

// Setup connection adapter; ensure DATABASE_URL is not undefined under strict type checks
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
});
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function d(dateStr: string) {
  return new Date(dateStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱  Starting seed…");

  // ── Admin user ─────────────────────────────────────────────────────────────
  const ADMIN_NAME = process.env.ADMIN_NAME?.trim() ?? "System Admin";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "admin@assetflow.dev";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@1234";

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, passwordHash, role: "ADMIN", status: "ACTIVE" },
    create: { name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, role: "ADMIN", status: "ACTIVE" },
    select: { id: true, email: true },
  });
  console.log(`  ✔ Admin: ${admin.email}`);

  // ── Departments ────────────────────────────────────────────────────────────
  const deptData = [
    { name: "Engineering",         code: "ENG",    description: "Product engineering and infrastructure" },
    { name: "Human Resources",     code: "HR",     description: "People operations and talent management" },
    { name: "Finance",             code: "FIN",    description: "Accounting, budgeting and compliance" },
    { name: "Operations",          code: "OPS",    description: "Day-to-day business operations" },
    { name: "Marketing",           code: "MKT",    description: "Brand, content and growth" },
    { name: "Sales",               code: "SALES",  description: "Revenue and customer acquisition" },
    { name: "Customer Support",    code: "CS",     description: "Post-sales support and success" },
    { name: "Design",              code: "DES",    description: "UX, product design and branding" },
  ];

  const depts: Record<string, string> = {}; // code → id
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description, status: "ACTIVE" },
      create: { name: d.name, code: d.code, description: d.description, status: "ACTIVE" },
      select: { id: true },
    });
    depts[d.code] = dept.id;
  }

  // Sub-departments
  const subDeptData = [
    { name: "Frontend Engineering",  code: "ENG-FE",  parentCode: "ENG",   description: "Web and mobile frontend" },
    { name: "Backend Engineering",   code: "ENG-BE",  parentCode: "ENG",   description: "APIs, services and data" },
    { name: "DevOps",                code: "ENG-OPS", parentCode: "ENG",   description: "CI/CD, infra and SRE" },
    { name: "Talent Acquisition",    code: "HR-TA",   parentCode: "HR",    description: "Recruiting and onboarding" },
    { name: "Digital Marketing",     code: "MKT-DIG", parentCode: "MKT",   description: "SEO, SEM and social media" },
  ];

  for (const sd of subDeptData) {
    const sub = await prisma.department.upsert({
      where: { code: sd.code },
      update: { name: sd.name, description: sd.description, parentId: depts[sd.parentCode], status: "ACTIVE" },
      create: { name: sd.name, code: sd.code, description: sd.description, parentId: depts[sd.parentCode], status: "ACTIVE" },
      select: { id: true },
    });
    depts[sd.code] = sub.id;
  }

  console.log(`  ✔ ${Object.keys(depts).length} departments`);

  // ── Asset Categories with Custom Fields ────────────────────────────────────
  async function upsertCategory(
    name: string,
    description: string,
    fields: { key: string; fieldType: "TEXT" | "NUMBER" | "DATE" | "ENUM"; enumOptions?: string[]; sortOrder: number }[]
  ) {
    const existing = await prisma.assetCategory.findUnique({ where: { name } });
    let categoryId: string;

    if (existing) {
      categoryId = existing.id;
      await prisma.assetCategory.update({
        where: { id: categoryId },
        data: { description },
      });
    } else {
      const cat = await prisma.assetCategory.create({
        data: { name, description },
        select: { id: true },
      });
      categoryId = cat.id;
    }

    // Upsert custom fields
    for (const f of fields) {
      await prisma.assetCategoryField.upsert({
        where: { categoryId_key: { categoryId, key: f.key } },
        update: { fieldType: f.fieldType, enumOptions: f.enumOptions ?? [], sortOrder: f.sortOrder },
        create: { categoryId, key: f.key, fieldType: f.fieldType, enumOptions: f.enumOptions ?? [], sortOrder: f.sortOrder },
      });
    }

    return categoryId;
  }

  const catLaptop = await upsertCategory("Laptop", "Portable computing devices for employees", [
    { key: "RAM (GB)",       fieldType: "ENUM",   enumOptions: ["4", "8", "16", "32", "64"],   sortOrder: 1 },
    { key: "Storage (GB)",   fieldType: "ENUM",   enumOptions: ["128", "256", "512", "1024"],  sortOrder: 2 },
    { key: "Screen Size",    fieldType: "ENUM",   enumOptions: ["13\"", "14\"", "15\"", "16\""], sortOrder: 3 },
    { key: "OS",             fieldType: "ENUM",   enumOptions: ["Windows 11", "macOS", "Ubuntu", "Chrome OS"], sortOrder: 4 },
    { key: "CPU",            fieldType: "TEXT",   sortOrder: 5 },
    { key: "Battery Health", fieldType: "ENUM",   enumOptions: ["Excellent", "Good", "Fair", "Replace"], sortOrder: 6 },
  ]);

  const catDesktop = await upsertCategory("Desktop / Workstation", "Fixed computing workstations", [
    { key: "RAM (GB)",     fieldType: "ENUM",   enumOptions: ["8", "16", "32", "64", "128"],   sortOrder: 1 },
    { key: "Storage",      fieldType: "TEXT",   sortOrder: 2 },
    { key: "GPU",          fieldType: "TEXT",   sortOrder: 3 },
    { key: "OS",           fieldType: "ENUM",   enumOptions: ["Windows 11", "Ubuntu", "macOS"], sortOrder: 4 },
    { key: "Form Factor",  fieldType: "ENUM",   enumOptions: ["Tower", "Mini", "All-in-One"],  sortOrder: 5 },
  ]);

  const catMonitor = await upsertCategory("Monitor / Display", "External display screens", [
    { key: "Screen Size",  fieldType: "ENUM",  enumOptions: ["21\"", "24\"", "27\"", "32\"", "34\""], sortOrder: 1 },
    { key: "Resolution",   fieldType: "ENUM",  enumOptions: ["Full HD", "2K QHD", "4K UHD"],          sortOrder: 2 },
    { key: "Panel Type",   fieldType: "ENUM",  enumOptions: ["IPS", "VA", "TN", "OLED"],              sortOrder: 3 },
    { key: "Refresh Rate", fieldType: "ENUM",  enumOptions: ["60 Hz", "75 Hz", "144 Hz", "165 Hz"],   sortOrder: 4 },
    { key: "Ports",        fieldType: "TEXT",  sortOrder: 5 },
  ]);

  const catMobile = await upsertCategory("Mobile Phone / Tablet", "Corporate mobile devices", [
    { key: "OS",         fieldType: "ENUM", enumOptions: ["Android", "iOS", "iPadOS"],   sortOrder: 1 },
    { key: "Storage",    fieldType: "ENUM", enumOptions: ["64GB", "128GB", "256GB", "512GB"], sortOrder: 2 },
    { key: "SIM Type",   fieldType: "ENUM", enumOptions: ["eSIM", "Nano SIM", "Dual SIM"], sortOrder: 3 },
    { key: "IMEI",       fieldType: "TEXT", sortOrder: 4 },
    { key: "MDM Enroll", fieldType: "ENUM", enumOptions: ["Enrolled", "Pending", "Exempt"], sortOrder: 5 },
  ]);

  const catNetworking = await upsertCategory("Networking Equipment", "Routers, switches, access points", [
    { key: "Device Type", fieldType: "ENUM", enumOptions: ["Router", "Switch", "Access Point", "Firewall", "Modem"], sortOrder: 1 },
    { key: "Ports",       fieldType: "NUMBER", sortOrder: 2 },
    { key: "Speed",       fieldType: "ENUM", enumOptions: ["100 Mbps", "1 Gbps", "2.5 Gbps", "10 Gbps"], sortOrder: 3 },
    { key: "Wi-Fi Std",   fieldType: "ENUM", enumOptions: ["Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "N/A"],     sortOrder: 4 },
    { key: "PoE",         fieldType: "ENUM", enumOptions: ["Yes", "No"], sortOrder: 5 },
  ]);

  const catServer = await upsertCategory("Server / Rack Equipment", "On-prem servers and rack devices", [
    { key: "CPU Cores",    fieldType: "NUMBER", sortOrder: 1 },
    { key: "RAM (GB)",     fieldType: "NUMBER", sortOrder: 2 },
    { key: "Storage (TB)", fieldType: "NUMBER", sortOrder: 3 },
    { key: "Form Factor",  fieldType: "ENUM",  enumOptions: ["1U", "2U", "4U", "Tower", "Blade"], sortOrder: 4 },
    { key: "OS",           fieldType: "TEXT",  sortOrder: 5 },
    { key: "IPMI/BMC",     fieldType: "ENUM",  enumOptions: ["Yes", "No"],                        sortOrder: 6 },
  ]);

  const catFurniture = await upsertCategory("Office Furniture", "Desks, chairs and storage", [
    { key: "Item Type",   fieldType: "ENUM", enumOptions: ["Desk", "Chair", "Cabinet", "Shelf", "Sofa", "Table"], sortOrder: 1 },
    { key: "Material",    fieldType: "ENUM", enumOptions: ["Wood", "Metal", "Glass", "Fabric", "Mesh"],           sortOrder: 2 },
    { key: "Colour",      fieldType: "TEXT", sortOrder: 3 },
    { key: "Adjustable",  fieldType: "ENUM", enumOptions: ["Yes", "No"],                                          sortOrder: 4 },
  ]);

  const catAV = await upsertCategory("AV / Conferencing", "Projectors, webcams, speakers, conference kits", [
    { key: "Device Type",  fieldType: "ENUM", enumOptions: ["Projector", "Webcam", "Speakerphone", "Display Bar", "Microphone", "Soundbar"], sortOrder: 1 },
    { key: "Resolution",   fieldType: "ENUM", enumOptions: ["720p", "1080p", "4K", "N/A"], sortOrder: 2 },
    { key: "Connectivity", fieldType: "TEXT", sortOrder: 3 },
  ]);

  const catVehicle = await upsertCategory("Vehicle", "Company owned vehicles", [
    { key: "Vehicle Type",  fieldType: "ENUM", enumOptions: ["Sedan", "SUV", "Van", "Two-Wheeler", "Truck"], sortOrder: 1 },
    { key: "Fuel Type",     fieldType: "ENUM", enumOptions: ["Petrol", "Diesel", "CNG", "Electric"],         sortOrder: 2 },
    { key: "Registration",  fieldType: "TEXT", sortOrder: 3 },
    { key: "Insurance Due", fieldType: "DATE", sortOrder: 4 },
    { key: "PUC Due",       fieldType: "DATE", sortOrder: 5 },
  ]);

  const catPeripheral = await upsertCategory("Peripheral / Accessory", "Keyboards, mice, headsets, docking stations", [
    { key: "Type",          fieldType: "ENUM", enumOptions: ["Keyboard", "Mouse", "Headset", "Webcam", "Docking Station", "USB Hub", "Charger", "Cable"], sortOrder: 1 },
    { key: "Connectivity",  fieldType: "ENUM", enumOptions: ["USB-A", "USB-C", "Bluetooth", "Wireless 2.4GHz", "Thunderbolt"], sortOrder: 2 },
    { key: "Paired With",   fieldType: "TEXT", sortOrder: 3 },
  ]);

  console.log("  ✔ 10 asset categories with custom fields");

  // ── Assets ─────────────────────────────────────────────────────────────────
  type AssetSeed = {
    name: string;
    description?: string;
    categoryId: string;
    deptCode?: string;
    serialNumber?: string;
    manufacturer: string;
    model: string;
    acquisitionDate?: string;
    acquisitionCost?: number;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    condition: "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
    status: "AVAILABLE" | "ALLOCATED" | "RESERVED" | "UNDER_MAINTENANCE" | "LOST" | "RETIRED" | "DISPOSED";
    location?: string;
    isBookable?: boolean;
    notes?: string;
    customFields?: Record<string, string>;
  };

  const assets: AssetSeed[] = [
    {
      name: "Dell Latitude 5540 #001",
      description: "Primary dev laptop for Engineering team",
      categoryId: catLaptop,
      deptCode: "ENG-BE",
      serialNumber: "SN-DELL-L5540-001",
      manufacturer: "Dell",
      model: "Latitude 5540",
      acquisitionDate: "2023-06-15",
      acquisitionCost: 85000,
      warrantyStartDate: "2023-06-15",
      warrantyEndDate: "2026-06-14",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "RAM (GB)": "16", "Storage (GB)": "512", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i5-1335U", "Battery Health": "Good" },
    },
    {
      name: "Dell Latitude 5540 #002",
      categoryId: catLaptop,
      deptCode: "ENG-FE",
      serialNumber: "SN-DELL-L5540-002",
      manufacturer: "Dell",
      model: "Latitude 5540",
      acquisitionDate: "2023-06-15",
      acquisitionCost: 85000,
      warrantyStartDate: "2023-06-15",
      warrantyEndDate: "2026-06-14",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "RAM (GB)": "16", "Storage (GB)": "512", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i5-1335U", "Battery Health": "Good" },
    },
    {
      name: "Apple MacBook Pro 14 #001",
      description: "High-performance laptop for senior design leads",
      categoryId: catLaptop,
      deptCode: "DES",
      serialNumber: "SN-APPLE-MBP14-001",
      manufacturer: "Apple",
      model: "MacBook Pro 14 (M3 Pro)",
      acquisitionDate: "2024-01-10",
      acquisitionCost: 215000,
      warrantyStartDate: "2024-01-10",
      warrantyEndDate: "2025-01-09",
      condition: "NEW",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Design Studio",
      isBookable: false,
      customFields: { "RAM (GB)": "32", "Storage (GB)": "1024", "Screen Size": "14\"", "OS": "macOS", "CPU": "Apple M3 Pro", "Battery Health": "Excellent" },
    },
    {
      name: "Apple MacBook Pro 14 #002",
      categoryId: catLaptop,
      deptCode: "DES",
      serialNumber: "SN-APPLE-MBP14-002",
      manufacturer: "Apple",
      model: "MacBook Pro 14 (M3 Pro)",
      acquisitionDate: "2024-01-10",
      acquisitionCost: 215000,
      warrantyStartDate: "2024-01-10",
      warrantyEndDate: "2025-01-09",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 2 — Design Studio",
      customFields: { "RAM (GB)": "32", "Storage (GB)": "1024", "Screen Size": "14\"", "OS": "macOS", "CPU": "Apple M3 Pro", "Battery Health": "Excellent" },
    },
    {
      name: "HP EliteBook 840 G9",
      categoryId: catLaptop,
      deptCode: "FIN",
      serialNumber: "SN-HP-EB840G9-001",
      manufacturer: "HP",
      model: "EliteBook 840 G9",
      acquisitionDate: "2022-11-01",
      acquisitionCost: 92000,
      warrantyStartDate: "2022-11-01",
      warrantyEndDate: "2025-10-31",
      condition: "FAIR",
      status: "ALLOCATED",
      location: "HQ Floor 1 — Finance Room",
      customFields: { "RAM (GB)": "16", "Storage (GB)": "512", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i7-1255U", "Battery Health": "Fair" },
    },
    {
      name: "Lenovo ThinkPad X1 Carbon Gen 11",
      categoryId: catLaptop,
      deptCode: "HR",
      serialNumber: "SN-LENO-X1C11-001",
      manufacturer: "Lenovo",
      model: "ThinkPad X1 Carbon Gen 11",
      acquisitionDate: "2023-03-20",
      acquisitionCost: 135000,
      warrantyStartDate: "2023-03-20",
      warrantyEndDate: "2026-03-19",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 1 — HR Suite",
      customFields: { "RAM (GB)": "16", "Storage (GB)": "512", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i7-1365U", "Battery Health": "Good" },
    },
    {
      name: "Lenovo ThinkPad E14 Gen 4",
      categoryId: catLaptop,
      deptCode: "SALES",
      serialNumber: "SN-LENO-E14G4-001",
      manufacturer: "Lenovo",
      model: "ThinkPad E14 Gen 4",
      acquisitionDate: "2022-06-01",
      acquisitionCost: 65000,
      warrantyStartDate: "2022-06-01",
      warrantyEndDate: "2024-05-31",
      condition: "POOR",
      status: "UNDER_MAINTENANCE",
      location: "IT Workshop",
      notes: "Keyboard replacement in progress",
      customFields: { "RAM (GB)": "8", "Storage (GB)": "256", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i5-1235U", "Battery Health": "Replace" },
    },
    {
      name: "Asus ZenBook 14 OLED",
      categoryId: catLaptop,
      serialNumber: "SN-ASUS-ZB14-001",
      manufacturer: "Asus",
      model: "ZenBook 14 OLED",
      acquisitionDate: "2024-04-01",
      acquisitionCost: 78000,
      warrantyStartDate: "2024-04-01",
      warrantyEndDate: "2027-03-31",
      condition: "NEW",
      status: "AVAILABLE",
      location: "IT Store Room",
      customFields: { "RAM (GB)": "16", "Storage (GB)": "512", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "AMD Ryzen 7 7745HX", "Battery Health": "Excellent" },
    },
    {
      name: "Dell Vostro 3510 (Spare)",
      categoryId: catLaptop,
      serialNumber: "SN-DELL-V3510-001",
      manufacturer: "Dell",
      model: "Vostro 3510",
      acquisitionDate: "2021-08-01",
      acquisitionCost: 45000,
      warrantyStartDate: "2021-08-01",
      warrantyEndDate: "2023-07-31",
      condition: "FAIR",
      status: "RETIRED",
      location: "IT Store Room",
      notes: "Retired — screen hinge broken, kept as parts donor",
      customFields: { "RAM (GB)": "8", "Storage (GB)": "256", "Screen Size": "15\"", "OS": "Windows 11", "CPU": "Intel Core i3-1115G4", "Battery Health": "Replace" },
    },
    {
      name: "Dell OptiPlex 7090 Tower",
      categoryId: catDesktop,
      deptCode: "FIN",
      serialNumber: "SN-DELL-OPT7090-001",
      manufacturer: "Dell",
      model: "OptiPlex 7090",
      acquisitionDate: "2022-02-14",
      acquisitionCost: 55000,
      warrantyStartDate: "2022-02-14",
      warrantyEndDate: "2025-02-13",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 1 — Finance Room",
      customFields: { "RAM (GB)": "16", "Storage": "512 GB SSD", "GPU": "Intel UHD 630", "OS": "Windows 11", "Form Factor": "Tower" },
    },
    {
      name: "HP Z2 Mini G9 Workstation",
      categoryId: catDesktop,
      deptCode: "DES",
      serialNumber: "SN-HP-Z2MINI-001",
      manufacturer: "HP",
      model: "Z2 Mini G9",
      acquisitionDate: "2023-09-01",
      acquisitionCost: 145000,
      warrantyStartDate: "2023-09-01",
      warrantyEndDate: "2026-08-31",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 2 — Design Studio",
      customFields: { "RAM (GB)": "32", "Storage": "1 TB NVMe + 2 TB HDD", "GPU": "NVIDIA RTX 3000", "OS": "Windows 11", "Form Factor": "Mini" },
    },
    {
      name: "Apple iMac 24 (M3)",
      categoryId: catDesktop,
      deptCode: "MKT-DIG",
      serialNumber: "SN-APPLE-IMAC24-001",
      manufacturer: "Apple",
      model: "iMac 24 M3",
      acquisitionDate: "2024-03-01",
      acquisitionCost: 145000,
      warrantyStartDate: "2024-03-01",
      warrantyEndDate: "2025-02-28",
      condition: "NEW",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Marketing Hub",
      customFields: { "RAM (GB)": "24", "Storage": "512 GB SSD", "GPU": "Apple M3 (10-core)", "OS": "macOS", "Form Factor": "All-in-One" },
    },
    {
      name: "LG 27UK850 4K Monitor #001",
      categoryId: catMonitor,
      deptCode: "ENG-FE",
      serialNumber: "SN-LG-27UK850-001",
      manufacturer: "LG",
      model: "27UK850-W",
      acquisitionDate: "2023-01-15",
      acquisitionCost: 32000,
      warrantyStartDate: "2023-01-15",
      warrantyEndDate: "2025-01-14",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Screen Size": "27\"", "Resolution": "4K UHD", "Panel Type": "IPS", "Refresh Rate": "60 Hz", "Ports": "HDMI 2.0 ×2, DP 1.4, USB-C" },
    },
    {
      name: "LG 27UK850 4K Monitor #002",
      categoryId: catMonitor,
      deptCode: "ENG-BE",
      serialNumber: "SN-LG-27UK850-002",
      manufacturer: "LG",
      model: "27UK850-W",
      acquisitionDate: "2023-01-15",
      acquisitionCost: 32000,
      warrantyStartDate: "2023-01-15",
      warrantyEndDate: "2025-01-14",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Screen Size": "27\"", "Resolution": "4K UHD", "Panel Type": "IPS", "Refresh Rate": "60 Hz", "Ports": "HDMI 2.0 ×2, DP 1.4, USB-C" },
    },
    {
      name: "Dell U2722D QHD Monitor",
      categoryId: catMonitor,
      deptCode: "HR",
      serialNumber: "SN-DELL-U2722D-001",
      manufacturer: "Dell",
      model: "UltraSharp U2722D",
      acquisitionDate: "2022-08-10",
      acquisitionCost: 28000,
      warrantyStartDate: "2022-08-10",
      warrantyEndDate: "2025-08-09",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 1 — HR Suite",
      customFields: { "Screen Size": "27\"", "Resolution": "2K QHD", "Panel Type": "IPS", "Refresh Rate": "60 Hz", "Ports": "HDMI 1.4, DP 1.2, USB-C" },
    },
    {
      name: "Samsung 34\" Ultrawide Curved Monitor",
      categoryId: catMonitor,
      deptCode: "DES",
      serialNumber: "SN-SAM-S34-001",
      manufacturer: "Samsung",
      model: "ViewFinity S65UC",
      acquisitionDate: "2024-02-01",
      acquisitionCost: 38000,
      warrantyStartDate: "2024-02-01",
      warrantyEndDate: "2027-01-31",
      condition: "NEW",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Design Studio",
      isBookable: false,
      customFields: { "Screen Size": "34\"", "Resolution": "2K QHD", "Panel Type": "VA", "Refresh Rate": "75 Hz", "Ports": "HDMI 1.4, DP 1.4, USB-C" },
    },
    {
      name: "Apple iPhone 15 Pro #001",
      categoryId: catMobile,
      deptCode: "SALES",
      serialNumber: "SN-APPLE-IP15P-001",
      manufacturer: "Apple",
      model: "iPhone 15 Pro",
      acquisitionDate: "2023-10-05",
      acquisitionCost: 134900,
      warrantyStartDate: "2023-10-05",
      warrantyEndDate: "2024-10-04",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "Field — Sales Team",
      customFields: { "OS": "iOS", "Storage": "256GB", "SIM Type": "eSIM", "IMEI": "358473829012345", "MDM Enroll": "Enrolled" },
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      categoryId: catMobile,
      deptCode: "MKT",
      serialNumber: "SN-SAM-S24U-001",
      manufacturer: "Samsung",
      model: "Galaxy S24 Ultra",
      acquisitionDate: "2024-02-15",
      acquisitionCost: 129999,
      warrantyStartDate: "2024-02-15",
      warrantyEndDate: "2025-02-14",
      condition: "NEW",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Marketing Hub",
      customFields: { "OS": "Android", "Storage": "256GB", "SIM Type": "Dual SIM", "IMEI": "490283741023456", "MDM Enroll": "Enrolled" },
    },
    {
      name: "Apple iPad Pro 12.9 M2",
      categoryId: catMobile,
      deptCode: "CS",
      serialNumber: "SN-APPLE-IPADPRO-001",
      manufacturer: "Apple",
      model: "iPad Pro 12.9 (M2)",
      acquisitionDate: "2023-05-01",
      acquisitionCost: 112900,
      warrantyStartDate: "2023-05-01",
      warrantyEndDate: "2024-04-30",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 1 — Support Centre",
      isBookable: true,
      notes: "Available for booking — used in demos and presentations",
      customFields: { "OS": "iPadOS", "Storage": "256GB", "SIM Type": "Nano SIM", "IMEI": "010283741234567", "MDM Enroll": "Enrolled" },
    },
    {
      name: "Cisco Catalyst 9200L Switch",
      categoryId: catNetworking,
      deptCode: "ENG-OPS",
      serialNumber: "SN-CISCO-C9200L-001",
      manufacturer: "Cisco",
      model: "Catalyst 9200L",
      acquisitionDate: "2022-01-10",
      acquisitionCost: 185000,
      warrantyStartDate: "2022-01-10",
      warrantyEndDate: "2027-01-09",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "Server Room — Rack A",
      customFields: { "Device Type": "Switch", "Ports": "24", "Speed": "1 Gbps", "Wi-Fi Std": "N/A", "PoE": "Yes" },
    },
    {
      name: "Ubiquiti UniFi AP-6 Pro",
      categoryId: catNetworking,
      deptCode: "ENG-OPS",
      serialNumber: "SN-UBI-UAP6PRO-001",
      manufacturer: "Ubiquiti",
      model: "UniFi U6-Pro",
      acquisitionDate: "2023-02-20",
      acquisitionCost: 22000,
      warrantyStartDate: "2023-02-20",
      warrantyEndDate: "2024-02-19",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Ceiling Mount",
      customFields: { "Device Type": "Access Point", "Ports": "1", "Speed": "2.5 Gbps", "Wi-Fi Std": "Wi-Fi 6", "PoE": "Yes" },
    },
    {
      name: "Ubiquiti UniFi AP-6 Pro #002",
      categoryId: catNetworking,
      deptCode: "ENG-OPS",
      serialNumber: "SN-UBI-UAP6PRO-002",
      manufacturer: "Ubiquiti",
      model: "UniFi U6-Pro",
      acquisitionDate: "2023-02-20",
      acquisitionCost: 22000,
      warrantyStartDate: "2023-02-20",
      warrantyEndDate: "2024-02-19",
      condition: "GOOD",
      status: "UNDER_MAINTENANCE",
      location: "IT Workshop",
      notes: "Intermittent radio failure — sent for RMA",
      customFields: { "Device Type": "Access Point", "Ports": "1", "Speed": "2.5 Gbps", "Wi-Fi Std": "Wi-Fi 6", "PoE": "Yes" },
    },
    {
      name: "Fortinet FortiGate 60F Firewall",
      categoryId: catNetworking,
      deptCode: "ENG-OPS",
      serialNumber: "SN-FTN-FG60F-001",
      manufacturer: "Fortinet",
      model: "FortiGate 60F",
      acquisitionDate: "2022-01-10",
      acquisitionCost: 75000,
      warrantyStartDate: "2022-01-10",
      warrantyEndDate: "2027-01-09",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "Server Room — Rack A",
      customFields: { "Device Type": "Firewall", "Ports": "10", "Speed": "10 Gbps", "Wi-Fi Std": "N/A", "PoE": "No" },
    },
    {
      name: "Dell PowerEdge R740 Server #001",
      categoryId: catServer,
      deptCode: "ENG-OPS",
      serialNumber: "SN-DELL-R740-001",
      manufacturer: "Dell",
      model: "PowerEdge R740",
      acquisitionDate: "2021-06-01",
      acquisitionCost: 450000,
      warrantyStartDate: "2021-06-01",
      warrantyEndDate: "2026-05-31",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "Server Room — Rack A Slot 1",
      customFields: { "CPU Cores": "40", "RAM (GB)": "256", "Storage (TB)": "20", "Form Factor": "2U", "OS": "Ubuntu 22.04 LTS", "IPMI/BMC": "Yes" },
    },
    {
      name: "Dell PowerEdge R740 Server #002",
      categoryId: catServer,
      deptCode: "ENG-OPS",
      serialNumber: "SN-DELL-R740-002",
      manufacturer: "Dell",
      model: "PowerEdge R740",
      acquisitionDate: "2021-06-01",
      acquisitionCost: 450000,
      warrantyStartDate: "2021-06-01",
      warrantyEndDate: "2026-05-31",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "Server Room — Rack A Slot 3",
      customFields: { "CPU Cores": "40", "RAM (GB)": "256", "Storage (TB)": "20", "Form Factor": "2U", "OS": "Ubuntu 22.04 LTS", "IPMI/BMC": "Yes" },
    },
    {
      name: "HP ProLiant ML110 Gen10 (Backup)",
      categoryId: catServer,
      deptCode: "ENG-OPS",
      serialNumber: "SN-HP-ML110-001",
      manufacturer: "HP",
      model: "ProLiant ML110 Gen10",
      acquisitionDate: "2020-03-15",
      acquisitionCost: 120000,
      warrantyStartDate: "2020-03-15",
      warrantyEndDate: "2023-03-14",
      condition: "FAIR",
      status: "RETIRED",
      location: "IT Store Room",
      notes: "Warranty expired — kept as cold backup. Schedule disposal review.",
      customFields: { "CPU Cores": "8", "RAM (GB)": "32", "Storage (TB)": "4", "Form Factor": "Tower", "OS": "Windows Server 2019", "IPMI/BMC": "Yes" },
    },
    {
      name: "Herman Miller Aeron Chair #001",
      categoryId: catFurniture,
      deptCode: "ENG",
      serialNumber: "SN-HM-AERON-001",
      manufacturer: "Herman Miller",
      model: "Aeron (Size B)",
      acquisitionDate: "2022-07-01",
      acquisitionCost: 85000,
      warrantyStartDate: "2022-07-01",
      warrantyEndDate: "2034-06-30",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Item Type": "Chair", "Material": "Mesh", "Colour": "Graphite", "Adjustable": "Yes" },
    },
    {
      name: "Herman Miller Aeron Chair #002",
      categoryId: catFurniture,
      deptCode: "DES",
      serialNumber: "SN-HM-AERON-002",
      manufacturer: "Herman Miller",
      model: "Aeron (Size B)",
      acquisitionDate: "2022-07-01",
      acquisitionCost: 85000,
      warrantyStartDate: "2022-07-01",
      warrantyEndDate: "2034-06-30",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Design Studio",
      customFields: { "Item Type": "Chair", "Material": "Mesh", "Colour": "Graphite", "Adjustable": "Yes" },
    },
    {
      name: "Autonomous SmartDesk Pro — Standing",
      categoryId: catFurniture,
      deptCode: "ENG-FE",
      serialNumber: "SN-AUTO-SDP-001",
      manufacturer: "Autonomous",
      model: "SmartDesk Pro",
      acquisitionDate: "2023-04-01",
      acquisitionCost: 32000,
      warrantyStartDate: "2023-04-01",
      warrantyEndDate: "2028-03-31",
      condition: "GOOD",
      status: "ALLOCATED",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Item Type": "Desk", "Material": "Wood", "Colour": "Walnut / Black", "Adjustable": "Yes" },
    },
    {
      name: "Conference Table 12-Seater",
      categoryId: catFurniture,
      deptCode: "OPS",
      serialNumber: "SN-CONF-TABLE-001",
      manufacturer: "Godrej Interio",
      model: "Optima 12-Seater",
      acquisitionDate: "2020-01-05",
      acquisitionCost: 75000,
      warrantyStartDate: "2020-01-05",
      warrantyEndDate: "2022-01-04",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 1 — Boardroom",
      customFields: { "Item Type": "Table", "Material": "Wood", "Colour": "Walnut", "Adjustable": "No" },
    },
    {
      name: "Logitech Rally Bar (Conf Room A)",
      categoryId: catAV,
      deptCode: "OPS",
      serialNumber: "SN-LOGI-RB-001",
      manufacturer: "Logitech",
      model: "Rally Bar",
      acquisitionDate: "2023-01-20",
      acquisitionCost: 92000,
      warrantyStartDate: "2023-01-20",
      warrantyEndDate: "2026-01-19",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 1 — Conference Room A",
      isBookable: true,
      customFields: { "Device Type": "Display Bar", "Resolution": "4K", "Connectivity": "USB-C, Bluetooth" },
    },
    {
      name: "Logitech Rally Bar (Conf Room B)",
      categoryId: catAV,
      deptCode: "OPS",
      serialNumber: "SN-LOGI-RB-002",
      manufacturer: "Logitech",
      model: "Rally Bar",
      acquisitionDate: "2023-01-20",
      acquisitionCost: 92000,
      warrantyStartDate: "2023-01-20",
      warrantyEndDate: "2026-01-19",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "HQ Floor 2 — Conference Room B",
      isBookable: true,
      customFields: { "Device Type": "Display Bar", "Resolution": "4K", "Connectivity": "USB-C, Bluetooth" },
    },
    {
      name: "Epson EB-L510U Laser Projector",
      categoryId: catAV,
      deptCode: "OPS",
      serialNumber: "SN-EPS-EBL510-001",
      manufacturer: "Epson",
      model: "EB-L510U",
      acquisitionDate: "2021-09-01",
      acquisitionCost: 68000,
      warrantyStartDate: "2021-09-01",
      warrantyEndDate: "2024-08-31",
      condition: "FAIR",
      status: "AVAILABLE",
      location: "HQ Floor 1 — Boardroom",
      isBookable: true,
      notes: "Lamp hours: ~3200 / 4000. Book early for all-hands.",
      customFields: { "Device Type": "Projector", "Resolution": "1080p", "Connectivity": "HDMI, VGA, LAN" },
    },
    {
      name: "Jabra Evolve2 85 Headset",
      categoryId: catAV,
      serialNumber: "SN-JAB-EV285-001",
      manufacturer: "Jabra",
      model: "Evolve2 85",
      acquisitionDate: "2023-07-01",
      acquisitionCost: 22000,
      warrantyStartDate: "2023-07-01",
      warrantyEndDate: "2025-06-30",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "IT Store Room",
      isBookable: true,
      notes: "Available for loan during WFH or travel",
      customFields: { "Device Type": "Headset", "Resolution": "N/A", "Connectivity": "USB-A, Bluetooth" },
    },
    {
      name: "Toyota Innova Crysta — MH12 AB1234",
      categoryId: catVehicle,
      deptCode: "OPS",
      serialNumber: "VIN-TOY-INNO-MH12AB1234",
      manufacturer: "Toyota",
      model: "Innova Crysta 2.4 VX",
      acquisitionDate: "2022-04-15",
      acquisitionCost: 2150000,
      warrantyStartDate: "2022-04-15",
      warrantyEndDate: "2025-04-14",
      condition: "GOOD",
      status: "AVAILABLE",
      location: "Basement Parking — B-04",
      isBookable: true,
      notes: "Shared vehicle. Book at least 1 day in advance.",
      customFields: { "Vehicle Type": "SUV", "Fuel Type": "Diesel", "Registration": "MH12 AB1234", "Insurance Due": "2025-04-14", "PUC Due": "2025-01-10" },
    },
    {
      name: "Honda City — MH12 CD5678",
      categoryId: catVehicle,
      deptCode: "SALES",
      serialNumber: "VIN-HON-CITY-MH12CD5678",
      manufacturer: "Honda",
      model: "City 4th Gen",
      acquisitionDate: "2021-06-01",
      acquisitionCost: 1050000,
      warrantyStartDate: "2021-06-01",
      warrantyEndDate: "2024-05-31",
      condition: "FAIR",
      status: "ALLOCATED",
      location: "Field — Sales Team",
      customFields: { "Vehicle Type": "Sedan", "Fuel Type": "Petrol", "Registration": "MH12 CD5678", "Insurance Due": "2025-05-31", "PUC Due": "2024-12-01" },
    },
    {
      name: "Logitech MX Keys S Keyboard",
      categoryId: catPeripheral,
      serialNumber: "SN-LOGI-MXKEYS-001",
      manufacturer: "Logitech",
      model: "MX Keys S",
      acquisitionDate: "2023-08-01",
      acquisitionCost: 9500,
      warrantyStartDate: "2023-08-01",
      warrantyEndDate: "2025-07-31",
      condition: "GOOD",
      status: "ALLOCATED",
      deptCode: "ENG-FE",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Type": "Keyboard", "Connectivity": "Bluetooth", "Paired With": "Dell Latitude 5540 #002" },
    },
    {
      name: "Logitech MX Master 3S Mouse",
      categoryId: catPeripheral,
      serialNumber: "SN-LOGI-MXM3S-001",
      manufacturer: "Logitech",
      model: "MX Master 3S",
      acquisitionDate: "2023-08-01",
      acquisitionCost: 8500,
      warrantyStartDate: "2023-08-01",
      warrantyEndDate: "2025-07-31",
      condition: "GOOD",
      status: "ALLOCATED",
      deptCode: "ENG-FE",
      location: "HQ Floor 3 — Engineering Bay",
      customFields: { "Type": "Mouse", "Connectivity": "Bluetooth", "Paired With": "Dell Latitude 5540 #002" },
    },
    {
      name: "CalDigit TS4 Thunderbolt 4 Dock",
      categoryId: catPeripheral,
      deptCode: "DES",
      serialNumber: "SN-CAL-TS4-001",
      manufacturer: "CalDigit",
      model: "TS4 Thunderbolt 4",
      acquisitionDate: "2024-01-10",
      acquisitionCost: 28000,
      warrantyStartDate: "2024-01-10",
      warrantyEndDate: "2027-01-09",
      condition: "NEW",
      status: "ALLOCATED",
      location: "HQ Floor 2 — Design Studio",
      customFields: { "Type": "Docking Station", "Connectivity": "Thunderbolt", "Paired With": "MacBook Pro 14 #001" },
    },
    {
      name: "Anker USB-C Hub 7-in-1",
      categoryId: catPeripheral,
      condition: "GOOD",
      status: "AVAILABLE",
      manufacturer: "Anker",
      model: "A8346 7-in-1 Hub",
      acquisitionDate: "2023-06-01",
      acquisitionCost: 2200,
      location: "IT Store Room",
      isBookable: true,
      customFields: { "Type": "USB Hub", "Connectivity": "USB-C", "Paired With": "" },
    },
    {
      name: "Dell Latitude 5420 (Lost in Transit)",
      categoryId: catLaptop,
      deptCode: "SALES",
      manufacturer: "Dell",
      model: "Latitude 5420",
      acquisitionDate: "2021-03-01",
      acquisitionCost: 75000,
      condition: "GOOD",
      status: "LOST",
      location: "Unknown — last seen Mumbai Airport",
      notes: "FIR filed 2023-11-10. Police case #MUM-2023-41234.",
      customFields: { "RAM (GB)": "8", "Storage (GB)": "256", "Screen Size": "14\"", "OS": "Windows 11", "CPU": "Intel Core i5-1135G7", "Battery Health": "Good" },
    },
    {
      name: "HP LaserJet Pro M404dn (Disposed)",
      categoryId: catPeripheral,
      deptCode: "FIN",
      serialNumber: "SN-HP-LJP-M404-001",
      manufacturer: "HP",
      model: "LaserJet Pro M404dn",
      acquisitionDate: "2019-01-15",
      acquisitionCost: 18000,
      warrantyStartDate: "2019-01-15",
      warrantyEndDate: "2021-01-14",
      condition: "DAMAGED",
      status: "DISPOSED",
      location: "Disposed — E-waste recycler",
      notes: "Disposed via certified e-waste vendor on 2024-01-05. Certificate stored in Finance docs.",
      customFields: { "Type": "Cable", "Connectivity": "USB-A", "Paired With": "" },
    },
  ];

  let assetCount = 0;
  for (const a of assets) {
    const where = a.serialNumber
      ? { serialNumber: a.serialNumber }
      : undefined;

    const existing = where
      ? await prisma.asset.findUnique({ where, select: { id: true } })
      : null;

    if (existing) {
      await prisma.asset.update({
        where: { id: existing.id },
        data: {
          name: a.name,
          description: a.description ?? null,
          manufacturer: a.manufacturer,
          model: a.model,
          acquisitionDate: a.acquisitionDate ? d(a.acquisitionDate) : null,
          acquisitionCost: a.acquisitionCost ?? null,
          warrantyStartDate: a.warrantyStartDate ? d(a.warrantyStartDate) : null,
          warrantyEndDate: a.warrantyEndDate ? d(a.warrantyEndDate) : null,
          condition: a.condition,
          status: a.status,
          location: a.location ?? null,
          isBookable: a.isBookable ?? false,
          notes: a.notes ?? null,
          categoryId: a.categoryId,
          departmentId: a.deptCode ? depts[a.deptCode] : null,
        },
      });
    } else {
      const customFieldEntries = a.customFields
        ? Object.entries(a.customFields).filter(([, v]) => v.trim() !== "")
        : [];

      const fieldRecords = customFieldEntries.length > 0
        ? await prisma.assetCategoryField.findMany({
            where: {
              categoryId: a.categoryId,
              key: { in: customFieldEntries.map(([k]) => k) },
            },
            select: { id: true, key: true },
          })
        : [];

      const keyToId = new Map(fieldRecords.map((f) => [f.key, f.id]));

      await prisma.asset.create({
        data: {
          name: a.name,
          description: a.description ?? null,
          serialNumber: a.serialNumber ?? null,
          manufacturer: a.manufacturer,
          model: a.model,
          acquisitionDate: a.acquisitionDate ? d(a.acquisitionDate) : null,
          acquisitionCost: a.acquisitionCost ?? null,
          warrantyStartDate: a.warrantyStartDate ? d(a.warrantyStartDate) : null,
          warrantyEndDate: a.warrantyEndDate ? d(a.warrantyEndDate) : null,
          condition: a.condition,
          status: a.status,
          location: a.location ?? null,
          isBookable: a.isBookable ?? false,
          notes: a.notes ?? null,
          photoUrls: [],
          documentUrls: [],
          categoryId: a.categoryId,
          departmentId: a.deptCode ? depts[a.deptCode] : null,
          registeredById: admin.id,
          customFieldValues: {
            create: customFieldEntries
              .filter(([k]) => keyToId.has(k))
              .map(([k, v]) => ({
                fieldId: keyToId.get(k)!,
                valueText: v,
              })),
          },
        },
      });
      assetCount++;
    }
  }

  console.log(`  ✔ ${assetCount} assets seeded (skipped existing serials)`);
  console.log("✅  Seed complete!");
}

main()
  .catch((e) => {
    console.error("Error during admin seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
