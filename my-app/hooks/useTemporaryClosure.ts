"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  STOREFRONT_STATUS_QUERY_KEY,
  type StorefrontStatus,
  storefrontStatusQueryOptions,
} from "@/hooks/useStorefrontStatus";

type TemporaryClosureUpdate = {
  isClosed: boolean;
  closureMessage: string | null;
};

export function useTemporaryClosure() {
  const queryClient = useQueryClient();
  const query = useQuery({
    ...storefrontStatusQueryOptions,
    select: (status) => status.temporaryClosure,
  });

  const updateMutation = useMutation({
    mutationFn: async (update: TemporaryClosureUpdate) => {
      const response = await fetch("/api/temporary-closure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update temporary closure");
      }

      return {
        isActive: result.isClosed === true,
        message: result.closureMessage ?? null,
      };
    },
    onSuccess: (temporaryClosure) => {
      queryClient.setQueryData<StorefrontStatus>(
        STOREFRONT_STATUS_QUERY_KEY,
        (current) => ({
          storeHours: current?.storeHours ?? [],
          maintenanceMode: current?.maintenanceMode ?? { isActive: false },
          temporaryClosure,
        })
      );
    },
  });

  return {
    isClosed: query.data?.isActive === true,
    closureMessage: query.data?.message ?? null,
    isLoading: query.isLoading,
    error: query.error,
    updateTemporaryClosure: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
