"use client";

import type { SelectStoreHours } from "@/lib/types";

export const STOREFRONT_STATUS_QUERY_KEY = ["storefront-status"] as const;

export type StorefrontStatus = {
  storeHours: SelectStoreHours[];
  maintenanceMode: {
    isActive: boolean;
  };
  temporaryClosure: {
    isActive: boolean;
    message: string | null;
  };
};

export async function fetchStorefrontStatus(): Promise<StorefrontStatus> {
  const response = await fetch("/api/storefront-status", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch storefront status");
  return response.json();
}

export const storefrontStatusQueryOptions = {
  queryKey: STOREFRONT_STATUS_QUERY_KEY,
  queryFn: fetchStorefrontStatus,
  staleTime: 30 * 1000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: true,
} as const;
