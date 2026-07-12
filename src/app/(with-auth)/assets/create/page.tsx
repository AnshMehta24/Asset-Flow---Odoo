import { redirect } from "next/navigation";
import { AssetForm } from "../_components/asset-form";
import { getAssetFormOptions } from "../_lib/asset-data";
import { getCurrentUser } from "@/lib/auth/user";

export const metadata = {
  title: "Register Asset — AssetFlow",
};

export default async function CreateAssetPage() {
  const [currentUser, options] = await Promise.all([
    getCurrentUser(),
    getAssetFormOptions(),
  ]);

  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ASSET_MANAGER")) {
    redirect("/assets");
  }

  return <AssetForm mode="create" options={options} />;
}
