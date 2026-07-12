export function formatAssetTag(tagNumber: number): string {
  return `AF-${String(tagNumber).padStart(4, "0")}`;
}
