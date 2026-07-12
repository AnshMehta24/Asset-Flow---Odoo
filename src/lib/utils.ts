import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats an auto-increment tag number as AF-0001, AF-0042, etc. */
export function formatAssetTag(tagNumber: number): string {
  return `AF-${String(tagNumber).padStart(4, "0")}`;
}
