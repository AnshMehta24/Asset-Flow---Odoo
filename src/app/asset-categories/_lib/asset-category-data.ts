import prisma from "@/lib/prisma";

export async function getAssetCategoryList(search?: string) {
  const query = search?.trim();

  return prisma.assetCategory.findMany({
    where: query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined,
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: {
          assets: true,
        },
      },
    },
  });
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
      customFieldSchema: true,
    },
  });
}
