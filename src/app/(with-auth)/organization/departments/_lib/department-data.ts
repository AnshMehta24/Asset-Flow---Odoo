import prisma from "@/lib/prisma";

export type DepartmentListItem = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  parentName: string | null;
  headName: string | null;
};

export type DepartmentFormOptions = {
  parentDepartments: {
    id: string;
    name: string;
    code: string;
  }[];
  headCandidates: {
    id: string;
    name: string;
  }[];
};

export type DepartmentListFilters = {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  page?: number;
};

export async function getDepartmentList(filters: DepartmentListFilters = {}) {
  const search = filters.search?.trim();
  const statusFilter = filters.status && filters.status !== "ALL" ? filters.status : undefined;

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = 10;

  const whereClause = {
    ...(statusFilter ? { status: statusFilter } : {}),
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
              code: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              head: {
                is: {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              parent: {
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

  const [departments, totalCount] = await Promise.all([
    prisma.department.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        parent: {
          select: {
            name: true,
          },
        },
        head: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.department.count({
      where: whereClause,
    }),
  ]);

  const items = departments.map((department) => ({
    id: department.id,
    name: department.name,
    code: department.code,
    status: department.status,
    parentName: department.parent?.name ?? null,
    headName: department.head?.name ?? null,
  })) satisfies DepartmentListItem[];

  return {
    departments: items,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getDepartmentFormOptions(excludeDepartmentId?: string) {
  const [parentDepartments, headCandidates] = await Promise.all([
    prisma.department.findMany({
      where: excludeDepartmentId
        ? {
            id: {
              not: excludeDepartmentId,
            },
          }
        : undefined,
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    parentDepartments,
    headCandidates,
  } satisfies DepartmentFormOptions;
}

export async function getDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      status: true,
      parentId: true,
      headId: true,
    },
  });
}
