import Link from "next/link";
import { PencilLine, Package, MapPin, Building2, User, Calendar, DollarSign, Shield, Tag, FileText, BookOpen, ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AssetStatusBadge, AssetConditionBadge, STATUS_LABELS, CONDITION_LABELS } from "./asset-status-badge";
import { formatAssetTag } from "@/lib/utils";
import type { AssetDetail } from "../_lib/asset-data";

type Props = {
  asset: AssetDetail;
  canEdit: boolean;
};

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

export function AssetDetail({ asset, canEdit }: Props) {
  const tag = formatAssetTag(asset.tagNumber);
  const activeAllocation = asset.allocations[0] ?? null;

  // Build custom fields map
  const customValueMap = new Map<string, string>();
  for (const v of asset.customFieldValues) {
    const val =
      v.valueEnum ??
      v.valueText ??
      (v.valueDate ? new Date(v.valueDate).toLocaleDateString() : null) ??
      v.valueNumber?.toString() ??
      "";
    customValueMap.set(v.fieldId, val);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Back link ── */}
      <div>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Assets
        </Link>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-muted-foreground">
              {tag}
            </span>
            <AssetStatusBadge status={asset.status} />
            <AssetConditionBadge condition={asset.condition} />
            {asset.isBookable && (
              <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                Bookable
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">{asset.category.name}</p>
        </div>
        {canEdit && (
          <Link
            href={`/assets/${asset.id}/edit`}
            className={buttonVariants({ variant: "outline", className: "gap-2" })}
          >
            <PencilLine className="size-4" />
            Edit Asset
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left column (2/3) ── */}
        <div className="flex flex-col gap-5 lg:col-span-2">

          {/* Current Status */}
          <Section title="Current Status">
            {activeAllocation ? (
              <div className="divide-y divide-border">
                <InfoRow
                  icon={User}
                  label="Current Holder"
                  value={
                    activeAllocation.employee?.name ??
                    activeAllocation.department?.name ??
                    "—"
                  }
                />
                <InfoRow
                  icon={Calendar}
                  label="Allocated On"
                  value={new Date(activeAllocation.allocatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
                {activeAllocation.expectedReturnDate && (
                  <InfoRow
                    icon={Calendar}
                    label="Expected Return"
                    value={new Date(activeAllocation.expectedReturnDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No active allocation. Asset is{" "}
                <span className="font-medium text-foreground">
                  {STATUS_LABELS[asset.status] ?? asset.status}
                </span>
                .
              </div>
            )}
          </Section>

          {/* General Information */}
          <Section title="General Information">
            <div className="divide-y divide-border">
              {asset.description && (
                <InfoRow icon={FileText} label="Description" value={asset.description} />
              )}
              <InfoRow icon={Tag} label="Asset Tag" value={tag} />
              {asset.serialNumber && (
                <InfoRow icon={Tag} label="Serial Number" value={asset.serialNumber} />
              )}
              {asset.qrCode && (
                <InfoRow icon={Tag} label="QR Code" value={asset.qrCode} />
              )}
              {asset.manufacturer && (
                <InfoRow icon={Package} label="Manufacturer" value={asset.manufacturer} />
              )}
              {asset.model && (
                <InfoRow icon={Package} label="Model" value={asset.model} />
              )}
              {asset.location && (
                <InfoRow icon={MapPin} label="Location" value={asset.location} />
              )}
              {asset.department && (
                <InfoRow icon={Building2} label="Department" value={asset.department.name} />
              )}
              <InfoRow
                icon={User}
                label="Registered By"
                value={asset.registeredBy.name}
              />
              <InfoRow
                icon={Calendar}
                label="Registered On"
                value={new Date(asset.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            </div>
          </Section>

          {/* Acquisition & Warranty */}
          {(asset.acquisitionDate ||
            asset.acquisitionCost ||
            asset.warrantyStartDate ||
            asset.warrantyEndDate) && (
            <Section title="Acquisition & Warranty">
              <div className="divide-y divide-border">
                {asset.acquisitionDate && (
                  <InfoRow
                    icon={Calendar}
                    label="Acquisition Date"
                    value={new Date(asset.acquisitionDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
                {asset.acquisitionCost && (
                  <InfoRow
                    icon={DollarSign}
                    label="Acquisition Cost"
                    value={`₹ ${Number(asset.acquisitionCost).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}`}
                  />
                )}
                {asset.warrantyStartDate && (
                  <InfoRow
                    icon={Shield}
                    label="Warranty Start"
                    value={new Date(asset.warrantyStartDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
                {asset.warrantyEndDate && (
                  <InfoRow
                    icon={Shield}
                    label="Warranty End"
                    value={new Date(asset.warrantyEndDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                )}
              </div>
            </Section>
          )}

          {/* Category Custom Fields */}
          {asset.category.customFields.length > 0 && (
            <Section title={`${asset.category.name} — Specific Fields`}>
              <div className="divide-y divide-border">
                {asset.category.customFields.map((field) => {
                  const val = customValueMap.get(field.id);
                  return (
                    <InfoRow
                      key={field.id}
                      icon={Tag}
                      label={field.key}
                      value={val || "—"}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {/* Notes */}
          {asset.notes && (
            <Section title="Notes">
              <p className="py-4 text-sm text-foreground whitespace-pre-wrap">
                {asset.notes}
              </p>
            </Section>
          )}
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="flex flex-col gap-5">
          {/* Photos */}
          {asset.photoUrls.length > 0 && (
            <Section title="Photos">
              <div className="grid grid-cols-2 gap-2 py-4">
                {asset.photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="aspect-square w-full rounded-xl border border-border object-cover transition hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Documents */}
          {asset.documentUrls.length > 0 && (
            <Section title="Documents">
              <div className="flex flex-col divide-y divide-border">
                {asset.documentUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <BookOpen className="size-4 shrink-0" />
                    <span className="truncate">
                      {url.split("/").pop() ?? `Document ${i + 1}`}
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Quick info card */}
          <Section title="Quick Info">
            <div className="divide-y divide-border">
              <InfoRow icon={Package} label="Status" value={<AssetStatusBadge status={asset.status} />} />
              <InfoRow icon={Package} label="Condition" value={<AssetConditionBadge condition={asset.condition} />} />
              <InfoRow
                icon={BookOpen}
                label="Bookable"
                value={asset.isBookable ? "Yes" : "No"}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
