interface DiscrepancyRow {
  auditName: string;
  auditStatus: string;
  department: string;
  auditLocation: string;
  startDate: string;
  endDate: string;
  assetTag: string;
  assetName: string;
  category: string;
  expectedLocation: string;
  observedLocation: string;
  verification: string;
  auditorNotes: string;
  verifiedBy: string;
  verifiedAt: string;
  resolutionStatus: string;
  resolutionNotes: string;
  resolvedBy: string;
  resolvedAt: string;
  currentAssetStatus: string;
  currentAssetCondition: string;
}

// Escape CSV cells to handle commas, double quotes, and newlines
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  let str = typeof val === "string" ? val : String(val);
  // If cell contains commas, quotes, or newlines, surround it in quotes and escape internal quotes
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateDiscrepancyCSV(
  audit: any,
  items: any[]
): string {
  const headers = [
    "Audit Name",
    "Audit Status",
    "Department",
    "Audit Location",
    "Start Date",
    "End Date",
    "Asset Tag",
    "Asset Name",
    "Category",
    "Expected Location",
    "Observed Location",
    "Verification",
    "Auditor Notes",
    "Verified By",
    "Verified At",
    "Resolution Status",
    "Resolution Notes",
    "Resolved By",
    "Resolved At",
    "Current Asset Status",
    "Current Asset Condition"
  ];

  const rows: string[][] = [headers];

  const auditName = audit.name;
  const auditStatus = audit.status;
  const department = audit.department?.name || "";
  const auditLocation = audit.location || "";
  const startDate = audit.startDate instanceof Date ? audit.startDate.toISOString().split("T")[0] : String(audit).split("T")[0];
  const endDate = audit.endDate instanceof Date ? audit.endDate.toISOString().split("T")[0] : String(audit).split("T")[0];

  for (const item of items) {
    const assetTag = `AF-${String(item.asset.tagNumber).padStart(4, "0")}`;
    const assetName = item.asset.name;
    const category = item.asset.category?.name || "";
    const expectedLocation = item.expectedLocation || "";
    const observedLocation = item.observedLocation || "";
    const verification = item.verification;
    const auditorNotes = item.notes || "";
    const verifiedBy = item.verifiedBy?.name || "";
    const verifiedAt = item.verifiedAt ? new Date(item.verifiedAt).toISOString() : "";
    const resolutionStatus = item.discrepancyStatus || "";
    const resolutionNotes = item.resolutionNotes || "";
    const resolvedBy = item.resolvedBy?.name || "";
    const resolvedAt = item.resolvedAt ? new Date(item.resolvedAt).toISOString() : "";
    const currentAssetStatus = item.asset.status;
    const currentAssetCondition = item.asset.condition;

    rows.push([
      auditName,
      auditStatus,
      department,
      auditLocation,
      startDate,
      endDate,
      assetTag,
      assetName,
      category,
      expectedLocation,
      observedLocation,
      verification,
      auditorNotes,
      verifiedBy,
      verifiedAt,
      resolutionStatus,
      resolutionNotes,
      resolvedBy,
      resolvedAt,
      currentAssetStatus,
      currentAssetCondition
    ]);
  }

  // Join rows with CRLF
  return rows.map((r) => r.map(escapeCSV).join(",")).join("\r\n");
}
