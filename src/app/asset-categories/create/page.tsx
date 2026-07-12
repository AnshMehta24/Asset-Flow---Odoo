import { AssetCategoryForm } from "../_components/asset-category-form";
import { AssetCategoryFilters } from "../_components/asset-category-filters";
import { OrganizationSetupTabs } from "../../organization-setup/_components/organization-setup-tabs";

export default function CreateAssetCategoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="categories" />
      <AssetCategoryFilters initialSearch="" />
      <AssetCategoryForm mode="create" />
    </div>
  );
}
