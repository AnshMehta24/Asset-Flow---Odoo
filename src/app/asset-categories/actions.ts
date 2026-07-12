"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Prisma } from "../../../generated/prisma/client";
import prisma from "@/lib/prisma";

export type AssetCategoryFormState = {
  success: boolean;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
};

function getTrimmedString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseCustomFieldSchema(rawValue: string) {
  let items: string[] = [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (Array.isArray(parsed)) {
      items = parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
  } catch {
    items = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (items.length === 0) {
    return null;
  }

  return items.map((label) => ({
    key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    type: "text",
  }));
}

function validateAssetCategoryPayload(formData: FormData) {
  const name = getTrimmedString(formData, "name");
  const description = getTrimmedString(formData, "description");
  const customFields = getTrimmedString(formData, "customFields");
  const fieldErrors: AssetCategoryFormState["fieldErrors"] = {};

  if (!name) {
    fieldErrors.name = ["Category name is required."];
  }

  if (description.length > 500) {
    fieldErrors.description = ["Description must be 500 characters or less."];
  }

  return {
    values: {
      name,
      description: description || null,
      customFields,
      customFieldSchema: parseCustomFieldSchema(customFields),
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
      ...(values.customFieldSchema
        ? { customFieldSchema: values.customFieldSchema }
        : {}),
    },
  });

  revalidatePath("/asset-categories");
  redirect("/asset-categories");
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
      ...(values.customFieldSchema
        ? { customFieldSchema: values.customFieldSchema }
        : { customFieldSchema: Prisma.JsonNull }),
    },
  });

  revalidatePath("/asset-categories");
  revalidatePath(`/asset-categories/${categoryId}/edit`);
  redirect("/asset-categories");
}
