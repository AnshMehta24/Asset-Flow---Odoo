import { notFound } from "next/navigation";
import { AssetDetail } from "../_components/asset-detail";
import { getAssetById } from "../_lib/asset-data";
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
    title: `${formatAssetTag(asset.tagNumber)} · ${asset.name} — AssetFlow`,
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;

  const [asset, currentUser] = await Promise.all([
    getAssetById(assetId),
    getCurrentUser(),
  ]);

  if (!asset) notFound();

  const canEdit =
    currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER";

  return <AssetDetail asset={asset} canEdit={canEdit} />;
}
