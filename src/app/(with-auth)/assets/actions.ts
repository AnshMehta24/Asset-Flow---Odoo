"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/user";

export type AssetFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

const INITIAL_STATE: AssetFormState = {
  success: false,
  message: "",
  fieldErrors: {},
};

// ──────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────

function getString(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function getOptionalString(fd: FormData, key: string): string | null {
  const v = getString(fd, key);
  return v || null;
}

function getOptionalDecimal(fd: FormData, key: string): number | null {
  const raw = getString(fd, key);
  if (!raw) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function getOptionalDate(fd: FormData, key: string): Date | null {
  const raw = getString(fd, key);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse newline-separated URL list */
function parseUrlList(fd: FormData, key: string): string[] {
  const raw = getString(fd, key);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);
}

/** Collect customField_<fieldId> entries from FormData */
function parseCustomFields(
  fd: FormData
): { fieldId: string; value: string }[] {
  const result: { fieldId: string; value: string }[] = [];
  fd.forEach((value, key) => {
    if (key.startsWith("customField_")) {
      const fieldId = key.replace("customField_", "");
      const v = String(value).trim();
      if (v) result.push({ fieldId, value: v });
    }
  });
  return result;
}

// ──────────────────────────────────────────────
// Create asset
// ──────────────────────────────────────────────

export async function createAsset(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ASSET_MANAGER")) {
    return {
      success: false,
      message: "You do not have permission to register assets.",
      fieldErrors: {},
    };
  }

  const name = getString(formData, "name");
  const categoryId = getString(formData, "categoryId");
  const serialNumber = getOptionalString(formData, "serialNumber");
  const qrCode = getOptionalString(formData, "qrCode");
  const fieldErrors: AssetFormState["fieldErrors"] = {};

  if (!name) fieldErrors.name = ["Asset name is required."];
  if (!categoryId) fieldErrors.categoryId = ["Category is required."];

  // Validate category exists
  if (categoryId) {
    const cat = await prisma.assetCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!cat) fieldErrors.categoryId = ["Selected category does not exist."];
  }

  // Unique checks
  if (serialNumber) {
    const dup = await prisma.asset.findFirst({
      where: { serialNumber },
      select: { id: true },
    });
    if (dup) fieldErrors.serialNumber = ["Serial number already exists."];
  }
  if (qrCode) {
    const dup = await prisma.asset.findFirst({
      where: { qrCode },
      select: { id: true },
    });
    if (dup) fieldErrors.qrCode = ["QR code already exists."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const conditionRaw = getString(formData, "condition");
  const statusRaw = getString(formData, "status");
  const condition = (
    ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].includes(conditionRaw)
      ? conditionRaw
      : "GOOD"
  ) as "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  const status = (
    [
      "AVAILABLE",
      "ALLOCATED",
      "RESERVED",
      "UNDER_MAINTENANCE",
      "LOST",
      "RETIRED",
      "DISPOSED",
    ].includes(statusRaw)
      ? statusRaw
      : "AVAILABLE"
  ) as
    | "AVAILABLE"
    | "ALLOCATED"
    | "RESERVED"
    | "UNDER_MAINTENANCE"
    | "LOST"
    | "RETIRED"
    | "DISPOSED";

  const customFields = parseCustomFields(formData);

  // Validate custom field IDs belong to the selected category
  let validFieldIds: string[] = [];
  if (customFields.length > 0) {
    const fields = await prisma.assetCategoryField.findMany({
      where: { categoryId },
      select: { id: true, fieldType: true },
    });
    validFieldIds = fields.map((f) => f.id);
  }

  const asset = await prisma.asset.create({
    data: {
      name,
      description: getOptionalString(formData, "description"),
      serialNumber,
      qrCode,
      manufacturer: getOptionalString(formData, "manufacturer"),
      model: getOptionalString(formData, "model"),
      acquisitionDate: getOptionalDate(formData, "acquisitionDate"),
      acquisitionCost: getOptionalDecimal(formData, "acquisitionCost"),
      warrantyStartDate: getOptionalDate(formData, "warrantyStartDate"),
      warrantyEndDate: getOptionalDate(formData, "warrantyEndDate"),
      condition,
      status,
      location: getOptionalString(formData, "location"),
      isBookable: formData.get("isBookable") === "true",
      notes: getOptionalString(formData, "notes"),
      photoUrls: parseUrlList(formData, "photoUrls"),
      documentUrls: parseUrlList(formData, "documentUrls"),
      categoryId,
      departmentId: getOptionalString(formData, "departmentId"),
      registeredById: user.id,
      // Write custom field values
      customFieldValues: {
        create: customFields
          .filter((cf) => validFieldIds.includes(cf.fieldId))
          .map((cf) => ({
            fieldId: cf.fieldId,
            valueText: cf.value,
          })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/assets");
  redirect(`/assets/${asset.id}`);
}

// ──────────────────────────────────────────────
// Update asset
// ──────────────────────────────────────────────

export async function updateAsset(
  assetId: string,
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ASSET_MANAGER")) {
    return {
      success: false,
      message: "You do not have permission to edit assets.",
      fieldErrors: {},
    };
  }

  const name = getString(formData, "name");
  const categoryId = getString(formData, "categoryId");
  const serialNumber = getOptionalString(formData, "serialNumber");
  const qrCode = getOptionalString(formData, "qrCode");
  const fieldErrors: AssetFormState["fieldErrors"] = {};

  if (!name) fieldErrors.name = ["Asset name is required."];
  if (!categoryId) fieldErrors.categoryId = ["Category is required."];

  if (serialNumber) {
    const dup = await prisma.asset.findFirst({
      where: { serialNumber, id: { not: assetId } },
      select: { id: true },
    });
    if (dup) fieldErrors.serialNumber = ["Serial number already exists."];
  }
  if (qrCode) {
    const dup = await prisma.asset.findFirst({
      where: { qrCode, id: { not: assetId } },
      select: { id: true },
    });
    if (dup) fieldErrors.qrCode = ["QR code already exists."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const conditionRaw = getString(formData, "condition");
  const statusRaw = getString(formData, "status");
  const condition = (
    ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].includes(conditionRaw)
      ? conditionRaw
      : "GOOD"
  ) as "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
  const status = (
    [
      "AVAILABLE",
      "ALLOCATED",
      "RESERVED",
      "UNDER_MAINTENANCE",
      "LOST",
      "RETIRED",
      "DISPOSED",
    ].includes(statusRaw)
      ? statusRaw
      : "AVAILABLE"
  ) as
    | "AVAILABLE"
    | "ALLOCATED"
    | "RESERVED"
    | "UNDER_MAINTENANCE"
    | "LOST"
    | "RETIRED"
    | "DISPOSED";

  const customFields = parseCustomFields(formData);

  // Get valid field IDs for category
  const fields = await prisma.assetCategoryField.findMany({
    where: { categoryId },
    select: { id: true, fieldType: true },
  });
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  await prisma.$transaction([
    // delete old custom field values
    prisma.assetCustomFieldValue.deleteMany({ where: { assetId } }),
    // update asset
    prisma.asset.update({
      where: { id: assetId },
      data: {
        name,
        description: getOptionalString(formData, "description"),
        serialNumber,
        qrCode,
        manufacturer: getOptionalString(formData, "manufacturer"),
        model: getOptionalString(formData, "model"),
        acquisitionDate: getOptionalDate(formData, "acquisitionDate"),
        acquisitionCost: getOptionalDecimal(formData, "acquisitionCost"),
        warrantyStartDate: getOptionalDate(formData, "warrantyStartDate"),
        warrantyEndDate: getOptionalDate(formData, "warrantyEndDate"),
        condition,
        status,
        location: getOptionalString(formData, "location"),
        isBookable: formData.get("isBookable") === "true",
        notes: getOptionalString(formData, "notes"),
        photoUrls: parseUrlList(formData, "photoUrls"),
        documentUrls: parseUrlList(formData, "documentUrls"),
        categoryId,
        departmentId: getOptionalString(formData, "departmentId"),
      },
    }),
    // write new custom field values
    ...(customFields
      .filter((cf) => fieldMap.has(cf.fieldId))
      .map((cf) =>
        prisma.assetCustomFieldValue.create({
          data: {
            assetId,
            fieldId: cf.fieldId,
            valueText: cf.value,
          },
        })
      )),
  ]);

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath(`/assets/${assetId}/edit`);
  redirect(`/assets/${assetId}`);
}
