import { AssetFilters } from "./_components/asset-filters";
import { AssetList } from "./_components/asset-list";
import { getAssetList, getAssetFormOptions } from "./_lib/asset-data";
import { getCurrentUser } from "@/lib/auth/user";
import { Pagination } from "@/components/ui/pagination";

export const metadata = {
  title: "Assets — AssetFlow",
  description: "Browse, search, and manage your organization's registered assets.",
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    categoryId?: string;
    departmentId?: string;
    page?: string;
  }>;
}) {
  const resolved = await searchParams;
  const search = resolved.search?.trim() ?? "";
  const status = resolved.status ?? "ALL";
  const categoryId = resolved.categoryId ?? "";
  const departmentId = resolved.departmentId ?? "";
  const page = Number(resolved.page) || 1;

  const [{ assets, totalCount, totalPages }, options, currentUser] = await Promise.all([
    getAssetList({ search, status, categoryId, departmentId, page }),
    getAssetFormOptions(),
    getCurrentUser(),
  ]);

  const canEdit =
    currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} asset{totalCount !== 1 ? "s" : ""} found
        </p>
      </div>

      <AssetFilters
        initialSearch={search}
        initialStatus={status}
        initialCategoryId={categoryId}
        initialDepartmentId={departmentId}
        categories={options.categories.map((c) => ({ id: c.id, name: c.name }))}
        departments={options.departments}
        canRegister={canEdit}
      />

      <div className="flex flex-col gap-4">
        <AssetList assets={assets} canEdit={canEdit} />
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </div>
  );
}
