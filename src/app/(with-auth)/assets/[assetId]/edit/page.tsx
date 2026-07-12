import { notFound, redirect } from "next/navigation";
import { AssetForm } from "../../_components/asset-form";
import { getAssetById, getAssetFormOptions } from "../../_lib/asset-data";
import { getCurrentUser } from "@/lib/auth/user";
import { formatAssetTag } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = await getAssetById(assetId);
  if (!asset) return { title: "Asset Not Found — AssetFlow" };
  return {
    title: `Edit ${formatAssetTag(asset.tagNumber)} · ${asset.name} — AssetFlow`,
  };
}

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;

  const [currentUser, asset, options] = await Promise.all([
    getCurrentUser(),
    getAssetById(assetId),
    getAssetFormOptions(),
  ]);

  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ASSET_MANAGER")) {
    redirect(`/assets/${assetId}`);
  }

  if (!asset) notFound();

  return <AssetForm mode="edit" options={options} asset={asset} />;
}
