import { notFound } from "next/navigation";

import { AssetCategoryForm } from "../../_components/asset-category-form";
import { AssetCategoryFilters } from "../../_components/asset-category-filters";
import { getAssetCategoryById } from "../../_lib/asset-category-data";
import { OrganizationSetupTabs } from "../../../organization-setup/_components/organization-setup-tabs";

export default async function EditAssetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const category = await getAssetCategoryById(categoryId);

  if (!category) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="categories" />
      <AssetCategoryFilters initialSearch="" />
      <AssetCategoryForm mode="edit" category={category} />
    </div>
  );
}
