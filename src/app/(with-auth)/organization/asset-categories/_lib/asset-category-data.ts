import prisma from "@/lib/prisma";

export async function getAssetCategoryList(filters: { search?: string; page?: number } = {}) {
  const query = filters.search?.trim();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = 10;

  const whereClause = query
    ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const [categories, totalCount] = await Promise.all([
    prisma.assetCategory.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        description: true,
        customFields: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            assets: true,
          },
        },
      },
    }),
    prisma.assetCategory.count({
      where: whereClause,
    }),
  ]);

  return {
    categories,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getAssetCategoryById(id: string) {
  return prisma.assetCategory.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      customFields: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          key: true,
          fieldType: true,
          enumOptions: true,
          sortOrder: true,
        },
      },
    },
  });
}
