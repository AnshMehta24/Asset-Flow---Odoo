import { notFound } from "next/navigation";

import { AssetCategoryForm } from "../../_components/asset-category-form";
import { getAssetCategoryById } from "../../_lib/asset-category-data";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";

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
      <AssetCategoryForm mode="edit" category={category} />
    </div>
  );
}
