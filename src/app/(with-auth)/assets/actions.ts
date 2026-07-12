"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/user";
import { generateAndUploadAssetQrCode, isCloudinaryConfigured } from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/utils";

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

function getString(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function getOptionalString(fd: FormData, key: string): string | null {
  const value = getString(fd, key);
  return value || null;
}

function getOptionalDecimal(fd: FormData, key: string): number | null {
  const raw = getString(fd, key);
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isNaN(value) ? null : value;
}

function getOptionalDate(fd: FormData, key: string): Date | null {
  const raw = getString(fd, key);
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function parseUrlList(fd: FormData, key: string): string[] {
  const raw = getString(fd, key);
  if (!raw) return [];

  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCustomFields(fd: FormData): { fieldId: string; value: string }[] {
  const result: { fieldId: string; value: string }[] = [];

  fd.forEach((value, key) => {
    if (!key.startsWith("customField_")) return;
    const fieldId = key.replace("customField_", "");
    const parsedValue = String(value).trim();
    if (parsedValue) {
      result.push({ fieldId, value: parsedValue });
    }
  });

  return result;
}

async function validateAssetInput(
  formData: FormData,
  assetId?: string
): Promise<{
  fieldErrors: AssetFormState["fieldErrors"];
  categoryId: string;
}> {
  const categoryId = getString(formData, "categoryId");
  const serialNumber = getOptionalString(formData, "serialNumber");
  const fieldErrors: AssetFormState["fieldErrors"] = {};

  if (!getString(formData, "name")) {
    fieldErrors.name = ["Asset name is required."];
  }

  if (!categoryId) {
    fieldErrors.categoryId = ["Category is required."];
  } else {
    const category = await prisma.assetCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      fieldErrors.categoryId = ["Selected category does not exist."];
    }
  }

  if (serialNumber) {
    const duplicate = await prisma.asset.findFirst({
      where: {
        serialNumber,
        ...(assetId ? { id: { not: assetId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      fieldErrors.serialNumber = ["Serial number already exists."];
    }
  }

  return { fieldErrors, categoryId };
}

function parseCondition(formData: FormData) {
  const value = getString(formData, "condition");
  return (
    ["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].includes(value) ? value : "GOOD"
  ) as "NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED";
}

function parseStatus(formData: FormData) {
  const value = getString(formData, "status");
  return (
    [
      "AVAILABLE",
      "ALLOCATED",
      "RESERVED",
      "UNDER_MAINTENANCE",
      "LOST",
      "RETIRED",
      "DISPOSED",
    ].includes(value)
      ? value
      : "AVAILABLE"
  ) as
    | "AVAILABLE"
    | "ALLOCATED"
    | "RESERVED"
    | "UNDER_MAINTENANCE"
    | "LOST"
    | "RETIRED"
    | "DISPOSED";
}

function buildAssetQrPayload(asset: {
  id: string;
  tagNumber: number;
  name: string;
  serialNumber: string | null;
}) {
  return JSON.stringify({
    assetId: asset.id,
    tag: formatAssetTag(asset.tagNumber),
    name: asset.name,
    serialNumber: asset.serialNumber,
  });
}

export async function createAsset(
  _prevState: AssetFormState = INITIAL_STATE,
  formData: FormData
): Promise<AssetFormState> {
  void _prevState;

  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return {
      success: false,
      message: "You do not have permission to register assets.",
      fieldErrors: {},
    };
  }

  const { fieldErrors, categoryId } = await validateAssetInput(formData);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const customFields = parseCustomFields(formData);
  let validFieldIds: string[] = [];

  if (customFields.length > 0) {
    const fields = await prisma.assetCategoryField.findMany({
      where: { categoryId },
      select: { id: true },
    });
    validFieldIds = fields.map((field) => field.id);
  }

  const asset = await prisma.asset.create({
    data: {
      name: getString(formData, "name"),
      description: getOptionalString(formData, "description"),
      serialNumber: getOptionalString(formData, "serialNumber"),
      manufacturer: getOptionalString(formData, "manufacturer"),
      model: getOptionalString(formData, "model"),
      acquisitionDate: getOptionalDate(formData, "acquisitionDate"),
      acquisitionCost: getOptionalDecimal(formData, "acquisitionCost"),
      warrantyStartDate: getOptionalDate(formData, "warrantyStartDate"),
      warrantyEndDate: getOptionalDate(formData, "warrantyEndDate"),
      condition: parseCondition(formData),
      status: parseStatus(formData),
      location: getOptionalString(formData, "location"),
      isBookable: formData.get("isBookable") === "true",
      notes: getOptionalString(formData, "notes"),
      photoUrls: parseUrlList(formData, "photoUrls"),
      documentUrls: parseUrlList(formData, "documentUrls"),
      categoryId,
      departmentId: getOptionalString(formData, "departmentId"),
      registeredById: user.id,
      customFieldValues: {
        create: customFields
          .filter((field) => validFieldIds.includes(field.fieldId))
          .map((field) => ({
            fieldId: field.fieldId,
            valueText: field.value,
          })),
      },
    },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      serialNumber: true,
    },
  });

  if (isCloudinaryConfigured()) {
    try {
      const qrUpload = await generateAndUploadAssetQrCode(
        buildAssetQrPayload(asset),
        asset.id
      );

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          qrCode: qrUpload.secure_url,
        },
      });
    } catch (error) {
      console.error("Failed to generate asset QR code", error);
    }
  }

  revalidatePath("/assets");
  revalidatePath(`/assets/${asset.id}`);
  revalidatePath("/");
  redirect(`/assets/${asset.id}`);
}

export async function updateAsset(
  assetId: string,
  _prevState: AssetFormState = INITIAL_STATE,
  formData: FormData
): Promise<AssetFormState> {
  void _prevState;

  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return {
      success: false,
      message: "You do not have permission to edit assets.",
      fieldErrors: {},
    };
  }

  const { fieldErrors, categoryId } = await validateAssetInput(formData, assetId);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const customFields = parseCustomFields(formData);
  const fields = await prisma.assetCategoryField.findMany({
    where: { categoryId },
    select: { id: true },
  });
  const validFieldIds = new Set(fields.map((field) => field.id));

  await prisma.$transaction([
    prisma.assetCustomFieldValue.deleteMany({ where: { assetId } }),
    prisma.asset.update({
      where: { id: assetId },
      data: {
        name: getString(formData, "name"),
        description: getOptionalString(formData, "description"),
        serialNumber: getOptionalString(formData, "serialNumber"),
        manufacturer: getOptionalString(formData, "manufacturer"),
        model: getOptionalString(formData, "model"),
        acquisitionDate: getOptionalDate(formData, "acquisitionDate"),
        acquisitionCost: getOptionalDecimal(formData, "acquisitionCost"),
        warrantyStartDate: getOptionalDate(formData, "warrantyStartDate"),
        warrantyEndDate: getOptionalDate(formData, "warrantyEndDate"),
        condition: parseCondition(formData),
        status: parseStatus(formData),
        location: getOptionalString(formData, "location"),
        isBookable: formData.get("isBookable") === "true",
        notes: getOptionalString(formData, "notes"),
        photoUrls: parseUrlList(formData, "photoUrls"),
        documentUrls: parseUrlList(formData, "documentUrls"),
        categoryId,
        departmentId: getOptionalString(formData, "departmentId"),
      },
    }),
    ...customFields
      .filter((field) => validFieldIds.has(field.fieldId))
      .map((field) =>
        prisma.assetCustomFieldValue.create({
          data: {
            assetId,
            fieldId: field.fieldId,
            valueText: field.value,
          },
        })
      ),
  ]);

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  revalidatePath(`/assets/${assetId}/edit`);
  revalidatePath("/");
  redirect(`/assets/${assetId}`);
}
