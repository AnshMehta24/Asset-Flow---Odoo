import { AssetCategoryFilters } from "./_components/asset-category-filters";
import { AssetCategoryList } from "./_components/asset-category-list";
import { getAssetCategoryList } from "./_lib/asset-category-data";
import { OrganizationSetupTabs } from "../organization-setup/_components/organization-setup-tabs";

export default async function AssetCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search?.trim() ?? "";
  const categories = await getAssetCategoryList(search);

  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="categories" />
      <AssetCategoryFilters key={search} initialSearch={search} />
      <AssetCategoryList categories={categories} />
    </div>
  );
}
