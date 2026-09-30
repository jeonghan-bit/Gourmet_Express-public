"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  SelectCollection,
  SelectProductWithCollection,
} from "@/lib/types";

export type PublicMenu = {
  collections: SelectCollection[];
  products: SelectProductWithCollection[];
};

export function usePublicMenu(initialData?: PublicMenu) {
  return useQuery<PublicMenu>({
    queryKey: ["public-menu"],
    queryFn: async () => {
      const response = await fetch("/api/menu");
      if (!response.ok) throw new Error("Failed to fetch menu");
      return response.json();
    },
    initialData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
