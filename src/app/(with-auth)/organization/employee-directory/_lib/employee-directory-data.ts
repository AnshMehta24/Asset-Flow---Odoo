import prisma from "@/lib/prisma";

export async function getEmployeeDirectoryList(filters: {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  page?: number;
}) {
  const search = filters.search?.trim();
  const status = filters.status && filters.status !== "ALL" ? filters.status : undefined;
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = 10;

  const whereClause = {
    role: {
      not: "ADMIN" as const,
    },
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              department: {
                is: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [employees, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: {
          select: {
            name: true,
          },
        },
        headOfDepartment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.count({
      where: whereClause,
    }),
  ]);

  return {
    employees,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
