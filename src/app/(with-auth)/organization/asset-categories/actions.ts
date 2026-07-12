"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

export type AssetCategoryFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

type CustomFieldDefinitionInput = {
  key: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "ENUM";
  enumOptions: string[];
};

function getTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeFieldKey(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseCustomFieldDefinitions(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item !== "object" || item === null) {
          return null;
        }

        const rawKey = "key" in item && typeof item.key === "string" ? item.key : "";
        const rawFieldType =
          "fieldType" in item && typeof item.fieldType === "string"
            ? item.fieldType
            : "TEXT";
        const enumOptions =
          "enumOptions" in item && Array.isArray(item.enumOptions)
            ? item.enumOptions
                .map((option: unknown) =>
                  typeof option === "string" ? normalizeFieldKey(option) : ""
                )
                .filter(Boolean)
            : [];

        const fieldType =
          rawFieldType === "NUMBER" ||
          rawFieldType === "DATE" ||
          rawFieldType === "ENUM"
            ? rawFieldType
            : "TEXT";

        const key = normalizeFieldKey(rawKey);

        if (!key) {
          return null;
        }

        return {
          key,
          fieldType,
          enumOptions: fieldType === "ENUM" ? enumOptions : [],
        } satisfies CustomFieldDefinitionInput;
      })
      .filter((item): item is CustomFieldDefinitionInput => item !== null);
  } catch {
    return [];
  }
}

function validateAssetCategoryPayload(formData: FormData) {
  const name = getTrimmedString(formData, "name");
  const description = getTrimmedString(formData, "description");
  const customFields = getTrimmedString(formData, "customFields");
  const customFieldDefinitions = parseCustomFieldDefinitions(customFields);
  const fieldErrors: AssetCategoryFormState["fieldErrors"] = {};

  if (!name) {
    fieldErrors.name = ["Category name is required."];
  }

  if (description.length > 500) {
    fieldErrors.description = ["Description must be 500 characters or less."];
  }

  const seenKeys = new Set<string>();

  customFieldDefinitions.forEach((field, index) => {
    const normalizedKey = field.key.toLowerCase();

    if (seenKeys.has(normalizedKey)) {
      fieldErrors.customFields = [
        `Custom field keys must be unique. Duplicate found at row ${index + 1}.`,
      ];
    }

    seenKeys.add(normalizedKey);

    if (field.fieldType === "ENUM" && field.enumOptions.length === 0) {
      fieldErrors.customFields = [
        `Enum field "${field.key}" needs at least one option.`,
      ];
    }
  });

  return {
    values: {
      name,
      description: description || null,
      customFieldDefinitions,
    },
    fieldErrors,
  };
}

export async function createAssetCategory(
  _prevState: AssetCategoryFormState,
  formData: FormData
): Promise<AssetCategoryFormState> {
  const { values, fieldErrors } = validateAssetCategoryPayload(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const duplicate = await prisma.assetCategory.findUnique({
    where: {
      name: values.name,
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    return {
      success: false,
      message: "Category already exists.",
      fieldErrors: {
        name: ["Category name must be unique."],
      },
    };
  }

  await prisma.assetCategory.create({
    data: {
      name: values.name,
      description: values.description,
      customFields: {
        create: values.customFieldDefinitions.map((field, index) => ({
          key: field.key,
          fieldType: field.fieldType,
          enumOptions: field.enumOptions,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/organization/asset-categories");
  redirect("/organization/asset-categories");
}

export async function updateAssetCategory(
  categoryId: string,
  _prevState: AssetCategoryFormState,
  formData: FormData
): Promise<AssetCategoryFormState> {
  const { values, fieldErrors } = validateAssetCategoryPayload(formData);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const duplicate = await prisma.assetCategory.findFirst({
    where: {
      id: {
        not: categoryId,
      },
      name: values.name,
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    return {
      success: false,
      message: "Category already exists.",
      fieldErrors: {
        name: ["Category name must be unique."],
      },
    };
  }

  await prisma.assetCategory.update({
    where: {
      id: categoryId,
    },
    data: {
      name: values.name,
      description: values.description,
      customFields: {
        deleteMany: {},
        create: values.customFieldDefinitions.map((field, index) => ({
          key: field.key,
          fieldType: field.fieldType,
          enumOptions: field.enumOptions,
          sortOrder: index,
        })),
      },
    },
  });

  revalidatePath("/organization/asset-categories");
  revalidatePath(`/organization/asset-categories/${categoryId}/edit`);
  redirect("/organization/asset-categories");
}
