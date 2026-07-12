import Link from "next/link";
import { PencilLine, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { AssetStatusBadge, AssetConditionBadge } from "./asset-status-badge";
import type { AssetListItem } from "../_lib/asset-data";

type Props = {
  assets: AssetListItem[];
  canEdit: boolean;
};

export function AssetList({ assets, canEdit }: Props) {
  if (assets.length === 0) {
    return (
      <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
        <div className="px-5 py-16 text-center text-sm text-muted-foreground">
          No assets found. Try adjusting the filters or{" "}
          {canEdit ? (
            <Link
              href="/assets/create"
              className="underline underline-offset-2 hover:text-foreground"
            >
              register a new asset
            </Link>
          ) : (
            "contact your Asset Manager"
          )}
          .
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
      {/* Header */}
      <div className="grid grid-cols-[110px_minmax(160px,1fr)_140px_130px_130px_80px] gap-4 border-b border-border bg-muted px-5 py-4 text-sm font-medium text-foreground">
        <span>Tag</span>
        <span>Name</span>
        <span>Category</span>
        <span>Status</span>
        <span>Location</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-border">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="grid grid-cols-[110px_minmax(160px,1fr)_140px_130px_130px_80px] items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-muted/40"
          >
            {/* Tag */}
            <Link
              href={`/assets/${asset.id}`}
              className="font-mono text-xs font-semibold text-foreground hover:underline"
            >
              {asset.tag}
            </Link>

            {/* Name */}
            <div className="min-w-0">
              <Link
                href={`/assets/${asset.id}`}
                className="block truncate font-medium text-foreground hover:underline"
              >
                {asset.name}
              </Link>
              {asset.departmentName && (
                <p className="truncate text-xs text-muted-foreground">
                  {asset.departmentName}
                </p>
              )}
            </div>

            {/* Category */}
            <p className="truncate text-muted-foreground">{asset.categoryName}</p>

            {/* Status */}
            <AssetStatusBadge status={asset.status} />

            {/* Location */}
            <p className="truncate text-muted-foreground">
              {asset.location ?? "—"}
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-1">
              <Link
                href={`/assets/${asset.id}`}
                aria-label={`View ${asset.name}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              >
                <ChevronRight className="size-4" />
              </Link>
              {canEdit && (
                <Link
                  href={`/assets/${asset.id}/edit`}
                  aria-label={`Edit ${asset.name}`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <PencilLine className="size-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
