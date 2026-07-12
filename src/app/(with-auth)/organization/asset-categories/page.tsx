import { AssetCategoryFilters } from "./_components/asset-category-filters";
import { AssetCategoryList } from "./_components/asset-category-list";
import { getAssetCategoryList } from "./_lib/asset-category-data";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";
import { requireCurrentUser } from "@/lib/auth/user";
import { AccessDenied } from "@/components/access-denied";
import { Pagination } from "@/components/ui/pagination";

export default async function AssetCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}) {
  const user = await requireCurrentUser();

  if (user?.role !== "ADMIN") {
    return <AccessDenied message="Only Admins can manage asset categories." />;
  }

  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const page = Number(resolvedSearchParams.page) || 1;

  const { categories, totalCount, totalPages } = await getAssetCategoryList({
    search,
    page,
  });

  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="categories" />
      <AssetCategoryFilters key={search} initialSearch={search} />
      <div className="flex flex-col gap-4">
        <AssetCategoryList categories={categories} />
        <Pagination currentPage={page} totalPages={totalPages} totalCount={totalCount} />
      </div>
    </div>
  );
}
