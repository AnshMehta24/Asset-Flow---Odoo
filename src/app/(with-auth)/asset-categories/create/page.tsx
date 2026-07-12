import { AssetCategoryForm } from "../_components/asset-category-form";
import { OrganizationSetupTabs } from "@/components/organization-setup-tabs";

export default function CreateAssetCategoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <OrganizationSetupTabs activeTab="categories" />
      <AssetCategoryForm mode="create" />
    </div>
  );
}
