"use client";

import { usePathname, useRouter } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type BookableAsset = { id: string; name: string; tagNumber: number };

export function ResourcePicker({
  assets,
  selectedAssetId,
}: {
  assets: BookableAsset[];
  selectedAssetId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="max-w-xs space-y-1.5">
      <p className="text-sm font-medium">Resource</p>
      <NativeSelect
        className="w-full"
        value={selectedAssetId}
        onChange={(e) => router.push(`${pathname}?assetId=${e.target.value}`)}
      >
        {assets.map((asset) => (
          <NativeSelectOption key={asset.id} value={asset.id}>
            {asset.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
