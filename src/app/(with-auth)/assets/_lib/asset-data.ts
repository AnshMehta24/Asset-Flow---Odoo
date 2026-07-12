import prisma from "@/lib/prisma";
import { formatAssetTag } from "@/lib/utils";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type AssetListFilters = {
  search?: string;
  categoryId?: string;
  status?: string;
  departmentId?: string;
  condition?: string;
  isBookable?: string;
  page?: number;
};

export type AssetListItem = {
  id: string;
  tag: string;
  name: string;
  categoryName: string;
  status: string;
  condition: string;
  location: string | null;
  departmentName: string | null;
  isBookable: boolean;
};

export type AssetFormOptions = {
  categories: {
    id: string;
    name: string;
    customFields: {
      id: string;
      key: string;
      fieldType: "TEXT" | "NUMBER" | "DATE" | "ENUM";
      enumOptions: string[];
      sortOrder: number;
    }[];
  }[];
  departments: {
    id: string;
    name: string;
    code: string;
  }[];
};

// ──────────────────────────────────────────────
// List
// ──────────────────────────────────────────────

export async function getAssetList(filters: AssetListFilters = {}) {
  const search = filters.search?.trim();
  const statusFilter =
    filters.status && filters.status !== "ALL" ? filters.status : undefined;
  const categoryFilter = filters.categoryId || undefined;
  const departmentFilter = filters.departmentId || undefined;
  const conditionFilter =
    filters.condition && filters.condition !== "ALL"
      ? filters.condition
      : undefined;
  const isBookableFilter =
    filters.isBookable === "true"
      ? true
      : filters.isBookable === "false"
      ? false
      : undefined;

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = 10;

  const whereClause = {
    ...(statusFilter ? { status: statusFilter as never } : {}),
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
    ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    ...(conditionFilter ? { condition: conditionFilter as never } : {}),
    ...(isBookableFilter !== undefined ? { isBookable: isBookableFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
            { qrCode: { contains: search, mode: "insensitive" as const } },
            { location: { contains: search, mode: "insensitive" as const } },
            { manufacturer: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [assets, totalCount] = await Promise.all([
    prisma.asset.findMany({
      where: whereClause,
      orderBy: [{ tagNumber: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        tagNumber: true,
        name: true,
        status: true,
        condition: true,
        location: true,
        isBookable: true,
        category: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.asset.count({
      where: whereClause,
    }),
  ]);

  const items = assets.map((a) => ({
    id: a.id,
    tag: formatAssetTag(a.tagNumber),
    name: a.name,
    categoryName: a.category.name,
    status: a.status,
    condition: a.condition,
    location: a.location,
    departmentName: a.department?.name ?? null,
    isBookable: a.isBookable,
  })) satisfies AssetListItem[];

  return {
    assets: items,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ──────────────────────────────────────────────
// Form options (categories + departments)
// ──────────────────────────────────────────────

export async function getAssetFormOptions(): Promise<AssetFormOptions> {
  const [categories, departments] = await Promise.all([
    prisma.assetCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        customFields: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            key: true,
            fieldType: true,
            enumOptions: true,
            sortOrder: true,
          },
        },
      },
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return { categories, departments };
}

// ──────────────────────────────────────────────
// Single asset (detail + edit)
// ──────────────────────────────────────────────

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      id: true,
      tagNumber: true,
      name: true,
      description: true,
      serialNumber: true,
      qrCode: true,
      manufacturer: true,
      model: true,
      acquisitionDate: true,
      acquisitionCost: true,
      warrantyStartDate: true,
      warrantyEndDate: true,
      condition: true,
      status: true,
      location: true,
      isBookable: true,
      notes: true,
      photoUrls: true,
      documentUrls: true,
      categoryId: true,
      departmentId: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          customFields: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              key: true,
              fieldType: true,
              enumOptions: true,
              sortOrder: true,
            },
          },
        },
      },
      department: { select: { id: true, name: true } },
      registeredBy: { select: { id: true, name: true } },
      customFieldValues: {
        select: {
          fieldId: true,
          valueText: true,
          valueNumber: true,
          valueDate: true,
          valueEnum: true,
        },
      },
      // latest active allocation for "current holder"
      allocations: {
        where: { status: "ACTIVE" },
        take: 1,
        orderBy: { allocatedAt: "desc" },
        select: {
          id: true,
          allocatedAt: true,
          expectedReturnDate: true,
          employee: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!asset) return null;

  return {
    ...asset,
    acquisitionCost: asset.acquisitionCost ? Number(asset.acquisitionCost) : null,
    customFieldValues: asset.customFieldValues.map((cf) => ({
      ...cf,
      valueNumber: cf.valueNumber ? Number(cf.valueNumber) : null,
    })),
  };
}

export type AssetDetail = NonNullable<Awaited<ReturnType<typeof getAssetById>>>;
