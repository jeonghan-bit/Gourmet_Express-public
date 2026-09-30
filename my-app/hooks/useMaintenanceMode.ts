"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  STOREFRONT_STATUS_QUERY_KEY,
  type StorefrontStatus,
  storefrontStatusQueryOptions,
} from "@/hooks/useStorefrontStatus";

export function useMaintenanceMode() {
  const queryClient = useQueryClient();

  const { data: isMaintenanceMode = false, isLoading } = useQuery({
    ...storefrontStatusQueryOptions,
    select: (status) => status.maintenanceMode.isActive,
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await fetch("/api/maintenance-mode", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update maintenance mode");
      }

      const data = await response.json();
      return data.isActive === true;
    },
    onSuccess: (isActive) => {
      queryClient.setQueryData<StorefrontStatus>(
        STOREFRONT_STATUS_QUERY_KEY,
        (current) => ({
          storeHours: current?.storeHours ?? [],
          maintenanceMode: { isActive },
          temporaryClosure: current?.temporaryClosure ?? {
            isActive: false,
            message: null,
          },
        })
      );
      void queryClient.invalidateQueries({
        queryKey: STOREFRONT_STATUS_QUERY_KEY,
      });
    },
    onError: (error) => {
      console.error("Error updating maintenance mode:", error);
    },
  });

  const toggleMaintenanceMode = () => {
    toggleMaintenanceMutation.mutate(!isMaintenanceMode);
  };

  return {
    isMaintenanceMode,
    isLoading,
    toggleMaintenanceMode,
    isToggling: toggleMaintenanceMutation.isPending,
  };
}
