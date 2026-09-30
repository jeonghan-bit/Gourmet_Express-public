import { STORE_CONFIG } from "@/lib/storeConfig";

export function formatDate(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: STORE_CONFIG.timeZone,
  });
}

export function formatDateOnly(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: STORE_CONFIG.timeZone,
  });
}
