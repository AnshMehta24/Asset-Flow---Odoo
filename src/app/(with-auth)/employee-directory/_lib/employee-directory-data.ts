import prisma from "@/lib/prisma";

export async function getEmployeeDirectoryList(filters: {
  search?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}) {
  const search = filters.search?.trim();
  const status = filters.status && filters.status !== "ALL" ? filters.status : undefined;

  return prisma.user.findMany({
    where: {
      role: {
        not: "ADMIN",
      },
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                department: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
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
    },
  });
}
